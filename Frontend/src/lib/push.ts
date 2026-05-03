import { apiFetch } from './api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPushNotifications(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] No soportado por el navegador.');
    return;
  }
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VITE_VAPID_PUBLIC_KEY no está definida en .env');
    return;
  }

  try {
    // Wait for the SW controlled by Vite-PWA to be ready
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service worker listo:', registration.scope);

    // Check for an existing subscription first
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('[Push] Creando nueva suscripción push...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } else {
      console.log('[Push] Suscripción push ya existía, re-enviando al backend...');
    }

    const subJSON = subscription.toJSON();

    if (!subJSON.keys?.p256dh || !subJSON.keys?.auth) {
      console.error('[Push] La suscripción no tiene claves. Algo falló al crearla.');
      return;
    }

    const payload = {
      usuario_id: userId,
      subscription: {
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys.p256dh,
        auth: subJSON.keys.auth,
      },
    };

    await apiFetch('/push-subscription', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('[Push] ✅ Suscripción enviada al backend correctamente.');
  } catch (error) {
    console.error('[Push] ❌ Error al suscribirse a notificaciones push:', error);
  }
}

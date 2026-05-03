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

// Wraps navigator.serviceWorker.ready with a timeout so it never hangs forever
function swReady(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('[Push] Service Worker no estuvo listo en ' + timeoutMs + 'ms'));
    }, timeoutMs);

    navigator.serviceWorker.ready.then((reg) => {
      clearTimeout(timer);
      resolve(reg);
    }).catch(reject);
  });
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    console.warn('[Push] Permiso denegado por el usuario anteriormente.');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] No soportado por este navegador.');
    return false;
  }
  if (!VAPID_PUBLIC_KEY) {
    console.error('[Push] VITE_VAPID_PUBLIC_KEY no está definida en .env');
    return false;
  }

  try {
    console.log('[Push] Esperando Service Worker...');
    const registration = await swReady();
    console.log('[Push] SW listo:', registration.scope);

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('[Push] Creando nueva suscripción push...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[Push] Suscripción creada:', subscription.endpoint.substring(0, 60) + '...');
    } else {
      console.log('[Push] Reutilizando suscripción existente.');
    }

    const subJSON = subscription.toJSON();

    if (!subJSON.keys?.p256dh || !subJSON.keys?.auth) {
      console.error('[Push] La suscripción no contiene claves. Abortando.');
      return false;
    }

    const payload = {
      usuario_id: userId,
      subscription: {
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys.p256dh,
        auth: subJSON.keys.auth,
      },
    };

    console.log('[Push] Enviando suscripción al backend para userId:', userId);
    await apiFetch('/push-subscription', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('[Push] ✅ Suscripción guardada en el servidor correctamente.');
    return true;
  } catch (error) {
    console.error('[Push] ❌ Error:', error);
    return false;
  }
}

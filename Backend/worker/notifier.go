package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"time"

	"agenda-backend/db"
	"agenda-backend/models"

	"github.com/SherClockHolmes/webpush-go"
)

func StartNotifier() {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for {
			<-ticker.C
			processNotifications()
		}
	}()
}

func processNotifications() {
	// Buscar notificaciones que deben enviarse
	rows, err := db.Pool.Query(context.Background(), `
		SELECT n.id, n.recordatorio_id, n.tipo, r.titulo, r.descripcion, u.correo, u.id as user_id
		FROM agenda_app.notificaciones n
		JOIN agenda_app.recordatorios r ON n.recordatorio_id = r.id
		JOIN agenda_app.usuarios u ON r.usuario_id = u.id
		WHERE n.enviada = false AND n.fecha_hora <= NOW()
	`)
	if err != nil {
		log.Printf("Error buscando notificaciones: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var notifID, recordatorioID, tipo, titulo, correo, userID string
		var descripcion *string
		if err := rows.Scan(&notifID, &recordatorioID, &tipo, &titulo, &descripcion, &correo, &userID); err != nil {
			log.Printf("Error mapeando notificacion a procesar: %v", err)
			continue
		}

		desc := ""
		if descripcion != nil {
			desc = *descripcion
		}

		// Enviar según el tipo
		if tipo == "email" || tipo == "ambas" {
			go sendEmail(correo, titulo, desc)
		}
		if tipo == "movil" || tipo == "ambas" {
			go sendWebPush(userID, titulo, desc)
		}

		// Marcar como enviada
		_, err := db.Pool.Exec(context.Background(), "UPDATE agenda_app.notificaciones SET enviada = true WHERE id = $1", notifID)
		if err != nil {
			log.Printf("Error marcando notificacion %s como enviada: %v", notifID, err)
		}
	}
}

func sendEmail(to string, titulo string, descripcion string) {
	user := os.Getenv("EMAIL_USER")
	pass := os.Getenv("EMAIL_PASS")

	if user == "" || pass == "" {
		log.Println("Credenciales de email no configuradas")
		return
	}

	bodyText := descripcion
	if bodyText == "" {
		bodyText = "No hay descripción adicional."
	}

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
      <span style="font-size: 28px;">🔔</span>
      <span style="font-size: 22px; font-weight: bold; color: #10b981;">D'Agenda</span>
    </div>
    <h2 style="color: #f8fafc; font-size: 20px; margin: 0 0 8px 0;">%s</h2>
    <p style="color: #94a3b8; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">%s</p>
    <hr style="border: none; border-top: 1px solid #334155; margin: 0 0 20px 0;">
    <p style="color: #475569; font-size: 12px; margin: 0;">Este recordatorio fue enviado automáticamente por tu Agenda Personal.</p>
  </div>
</body>
</html>
`, titulo, bodyText)

	fromHeader := fmt.Sprintf("From: D'Agenda <%s>\r\n", user)
	toHeader := fmt.Sprintf("To: %s\r\n", to)
	subjectHeader := fmt.Sprintf("Subject: =?UTF-8?Q?Recordatorio:_%s?=\r\n", titulo)
	mimeHeaders := "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n"

	msg := []byte(fromHeader + toHeader + subjectHeader + mimeHeaders + "\r\n" + htmlBody)

	auth := smtp.PlainAuth("", user, pass, "smtp.gmail.com")
	err := smtp.SendMail("smtp.gmail.com:587", auth, user, []string{to}, msg)
	if err != nil {
		log.Printf("Error enviando email a %s: %v", to, err)
	} else {
		log.Printf("Email enviado a %s", to)
	}
}

func sendWebPush(userID string, titulo string, descripcion string) {
	pubKey := os.Getenv("VAPID_PUBLIC_KEY")
	privKey := os.Getenv("VAPID_PRIVATE_KEY")
	contact := "mailto:" + os.Getenv("EMAIL_USER")

	if pubKey == "" || privKey == "" {
		log.Println("Claves VAPID no configuradas")
		return
	}

	rows, err := db.Pool.Query(context.Background(), "SELECT endpoint, p256dh, auth FROM agenda_app.suscripciones_push WHERE usuario_id = $1", userID)
	if err != nil {
		log.Printf("Error buscando suscripciones push: %v", err)
		return
	}
	defer rows.Close()

	payload, _ := json.Marshal(map[string]string{
		"title": titulo,
		"body":  descripcion,
	})

	for rows.Next() {
		var sub models.SuscripcionPush
		if err := rows.Scan(&sub.Endpoint, &sub.P256dh, &sub.Auth); err != nil {
			continue
		}

		s := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}

		resp, err := webpush.SendNotification(payload, s, &webpush.Options{
			Subscriber:      contact,
			VAPIDPublicKey:  pubKey,
			VAPIDPrivateKey: privKey,
			TTL:             30,
		})
		if err != nil {
			log.Printf("Error enviando web push: %v", err)
		} else {
			defer resp.Body.Close()
			log.Printf("Web push enviado (Status: %d)", resp.StatusCode)
			if resp.StatusCode == 410 {
				// Suscripción expirada, habría que borrarla, pero por simplicidad se ignora aquí
				_, _ = db.Pool.Exec(context.Background(), "DELETE FROM agenda_app.suscripciones_push WHERE endpoint = $1", sub.Endpoint)
			}
		}
	}
}

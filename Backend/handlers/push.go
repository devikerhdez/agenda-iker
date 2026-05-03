package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"agenda-backend/db"
	"agenda-backend/models"
)

type SubscribeRequest struct {
	UsuarioID    string                 `json:"usuario_id"`
	Subscription models.SuscripcionPush `json:"subscription"`
}

func SubscribePush(w http.ResponseWriter, r *http.Request) {
	var req SubscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO agenda_app.suscripciones_push (usuario_id, endpoint, p256dh, auth)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (usuario_id, endpoint) DO UPDATE 
		SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
	`, req.UsuarioID, req.Subscription.Endpoint, req.Subscription.P256dh, req.Subscription.Auth)

	if err != nil {
		log.Printf("Error insertando suscripción en DB: %v", err)
		http.Error(w, "Error guardando suscripción", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Suscripción guardada"})
}

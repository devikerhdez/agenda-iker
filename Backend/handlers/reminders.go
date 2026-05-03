package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"agenda-backend/db"
	"agenda-backend/models"
)

func GetReminders(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId requerido", http.StatusBadRequest)
		return
	}

	rows, err := db.Pool.Query(context.Background(), `
		SELECT 
			r.id, r.usuario_id, r.titulo, r.descripcion, r.fecha_hora, r.prioridad, r.completado, r.created_at, r.es_recurrente, r.dias_repeticion, r.ciclo_id,
			COALESCE(
				(SELECT json_agg(json_build_object(
					'id', n.id,
					'fecha_hora', n.fecha_hora,
					'tipo', n.tipo,
					'enviada', n.enviada
				)) FROM agenda_app.notificaciones n WHERE n.recordatorio_id = r.id), '[]'::json
			) as notifs
		FROM agenda_app.recordatorios r
		WHERE r.usuario_id = $1
		ORDER BY r.completado ASC, r.fecha_hora ASC
	`, userID)
	
	if err != nil {
		http.Error(w, "Error consultando recordatorios", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var reminders []models.Recordatorio
	for rows.Next() {
		var rec models.Recordatorio
		var notifsJson []byte
		if err := rows.Scan(&rec.ID, &rec.UsuarioID, &rec.Titulo, &rec.Descripcion, &rec.FechaHora, &rec.Prioridad, &rec.Completado, &rec.CreatedAt, &rec.EsRecurrente, &rec.DiasRepeticion, &rec.CicloID, &notifsJson); err != nil {
			http.Error(w, "Error mapeando recordatorio", http.StatusInternalServerError)
			return
		}
		json.Unmarshal(notifsJson, &rec.Notificaciones)
		reminders = append(reminders, rec)
	}

	if reminders == nil {
		reminders = []models.Recordatorio{} // Retornar array vacío en lugar de null
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reminders)
}

type CreateReminderRequest struct {
	UsuarioID      string                `json:"usuario_id"`
	Titulo         string                `json:"titulo"`
	Descripcion    *string               `json:"descripcion"`
	FechaHora      string                `json:"fecha_hora"`
	Prioridad      string                `json:"prioridad"`
	EsRecurrente   bool                  `json:"es_recurrente"`
	DiasRepeticion []int                 `json:"dias_repeticion"`
	Notificaciones []models.Notificacion `json:"notificaciones"`
}

func CreateReminder(w http.ResponseWriter, r *http.Request) {
	var req CreateReminderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	var recordatorioID string
	err := db.Pool.QueryRow(context.Background(), `
		INSERT INTO agenda_app.recordatorios (usuario_id, titulo, descripcion, fecha_hora, prioridad, es_recurrente, dias_repeticion)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
	`, req.UsuarioID, req.Titulo, req.Descripcion, req.FechaHora, req.Prioridad, req.EsRecurrente, req.DiasRepeticion).Scan(&recordatorioID)

	if err != nil {
		http.Error(w, "Error al crear recordatorio", http.StatusInternalServerError)
		return
	}

	for _, notif := range req.Notificaciones {
		_, err := db.Pool.Exec(context.Background(), `
			INSERT INTO agenda_app.notificaciones (recordatorio_id, fecha_hora, tipo)
			VALUES ($1, $2, $3)
		`, recordatorioID, notif.FechaHora, notif.Tipo)
		if err != nil {
			// Log error but don't fail the whole request
			continue
		}
	}

	// Si es recurrente, generar las instancias para esta semana
	if req.EsRecurrente {
		// Importar agenda-backend/worker y agenda-backend/models. Since we can't import worker easily without cyclic dependencies if worker imports handlers, we should just call it. Wait, worker imports db and models, so we can import worker in handlers.
		// Wait, I didn't add worker import. Let's do it below or use a separate file. For now, I will just do it inline here to avoid import issues.
		// Actually, let's just trigger a goroutine to generate the next 7 days for this specific cycle.
		// I need to parse the time.
		fechaParsed, _ := time.Parse(time.RFC3339, req.FechaHora)
		
		var cycle = models.Recordatorio{
			ID: recordatorioID,
			UsuarioID: req.UsuarioID,
			Titulo: req.Titulo,
			Descripcion: req.Descripcion,
			FechaHora: fechaParsed,
			Prioridad: req.Prioridad,
			DiasRepeticion: req.DiasRepeticion,
			Notificaciones: req.Notificaciones,
		}

		go func(c models.Recordatorio) {
			importWorkerGenerate(c) // Helper function to be defined at the bottom
		}(cycle)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Recordatorio creado exitosamente"})
}

type UpdateReminderRequest struct {
	Completado bool `json:"completado"`
}

func UpdateReminder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id") // Go 1.22+ wildcard routing
	if id == "" {
		http.Error(w, "ID requerido", http.StatusBadRequest)
		return
	}

	var req UpdateReminderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	_, err := db.Pool.Exec(context.Background(), `
		UPDATE agenda_app.recordatorios SET completado = $1 WHERE id = $2
	`, req.Completado, id)

	if err != nil {
		http.Error(w, "Error al actualizar", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Actualizado"})
}

func DeleteReminder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID requerido", http.StatusBadRequest)
		return
	}

	_, err := db.Pool.Exec(context.Background(),
		"DELETE FROM agenda_app.recordatorios WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Error al eliminar", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Eliminado"})
}

type BulkActionRequest struct {
	IDs    []string `json:"ids"`
	Action string   `json:"action"` // "delete" | "complete"
}

func BulkActionReminders(w http.ResponseWriter, r *http.Request) {
	var req BulkActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	// Build query dynamically using ANY
	switch req.Action {
	case "delete":
		_, err := db.Pool.Exec(context.Background(),
			"DELETE FROM agenda_app.recordatorios WHERE id = ANY($1::uuid[])", req.IDs)
		if err != nil {
			http.Error(w, "Error al eliminar en bloque", http.StatusInternalServerError)
			return
		}
	case "complete":
		_, err := db.Pool.Exec(context.Background(),
			"UPDATE agenda_app.recordatorios SET completado = true WHERE id = ANY($1::uuid[])", req.IDs)
		if err != nil {
			http.Error(w, "Error al completar en bloque", http.StatusInternalServerError)
			return
		}
	default:
		http.Error(w, "Acción no reconocida", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "OK"})
}

// Helper to avoid cyclic imports if any, using local query
func importWorkerGenerate(cycle models.Recordatorio) {
	now := time.Now()
	endDate := now.AddDate(0, 0, 7)
	
	currentDate := now
	for !currentDate.After(endDate) {
		weekday := int(currentDate.Weekday())
		matches := false
		for _, d := range cycle.DiasRepeticion {
			if weekday == d {
				matches = true
				break
			}
		}

		if matches {
			instanceTime := time.Date(
				currentDate.Year(), currentDate.Month(), currentDate.Day(),
				cycle.FechaHora.Hour(), cycle.FechaHora.Minute(), cycle.FechaHora.Second(), 0, currentDate.Location(),
			)
			var instanceID string
			err := db.Pool.QueryRow(context.Background(), `
				INSERT INTO agenda_app.recordatorios (usuario_id, titulo, descripcion, fecha_hora, prioridad, es_recurrente, dias_repeticion, ciclo_id)
				VALUES ($1, $2, $3, $4, $5, false, '{}', $6) RETURNING id
			`, cycle.UsuarioID, cycle.Titulo, cycle.Descripcion, instanceTime, cycle.Prioridad, cycle.ID).Scan(&instanceID)

			if err == nil {
				for _, notif := range cycle.Notificaciones {
					diff := notif.FechaHora.Sub(cycle.FechaHora)
					notifInstanceTime := instanceTime.Add(diff)
					_, _ = db.Pool.Exec(context.Background(), `
						INSERT INTO agenda_app.notificaciones (recordatorio_id, fecha_hora, tipo)
						VALUES ($1, $2, $3)
					`, instanceID, notifInstanceTime, notif.Tipo)
				}
			}
		}
		currentDate = currentDate.AddDate(0, 0, 1)
	}
}

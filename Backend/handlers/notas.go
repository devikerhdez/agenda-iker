package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"agenda-backend/db"
	"agenda-backend/models"
)

// GetNotes devuelve todas las notas de un usuario
func GetNotes(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId requerido", http.StatusBadRequest)
		return
	}

	rows, err := db.Pool.Query(context.Background(), `
		SELECT id, usuario_id, titulo, contenido, created_at, updated_at
		FROM agenda_app.notas
		WHERE usuario_id = $1
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		http.Error(w, "Error consultando notas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	notas := []models.Nota{}
	for rows.Next() {
		var n models.Nota
		if err := rows.Scan(&n.ID, &n.UsuarioID, &n.Titulo, &n.Contenido, &n.CreatedAt, &n.UpdatedAt); err != nil {
			continue
		}
		notas = append(notas, n)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notas)
}

// CreateNote crea una nueva nota
func CreateNote(w http.ResponseWriter, r *http.Request) {
	var req models.Nota
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	err := db.Pool.QueryRow(context.Background(), `
		INSERT INTO agenda_app.notas (usuario_id, titulo, contenido)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at
	`, req.UsuarioID, req.Titulo, req.Contenido).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)

	if err != nil {
		http.Error(w, "Error al crear nota", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

// UpdateNote actualiza una nota existente
func UpdateNote(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID requerido", http.StatusBadRequest)
		return
	}

	var req models.Nota
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	_, err := db.Pool.Exec(context.Background(), `
		UPDATE agenda_app.notas
		SET titulo = $1, contenido = $2, updated_at = NOW()
		WHERE id = $3
	`, req.Titulo, req.Contenido, id)

	if err != nil {
		http.Error(w, "Error al actualizar nota", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Nota actualizada"})
}

// DeleteNote elimina una nota
func DeleteNote(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID requerido", http.StatusBadRequest)
		return
	}

	_, err := db.Pool.Exec(context.Background(), "DELETE FROM agenda_app.notas WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Error al eliminar nota", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Nota eliminada"})
}

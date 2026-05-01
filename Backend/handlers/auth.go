package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"agenda-backend/db"
	"agenda-backend/models"

	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Nombre   string `json:"nombre"`
	Correo   string `json:"correo"`
	Password string `json:"password"`
	Tema     string `json:"tema"`
}

func Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	// Verificar si el correo ya existe
	var existingID string
	err := db.Pool.QueryRow(context.Background(), "SELECT id FROM agenda_app.usuarios WHERE correo = $1", req.Correo).Scan(&existingID)
	if err == nil {
		http.Error(w, "El correo ya está en uso", http.StatusConflict)
		return
	}

	// Hash password
	hashedPw, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error encriptando contraseña", http.StatusInternalServerError)
		return
	}

	// Insertar usuario
	_, err = db.Pool.Exec(context.Background(), `
		INSERT INTO agenda_app.usuarios (nombre, correo, password_hash, tema)
		VALUES ($1, $2, $3, $4)
	`, req.Nombre, req.Correo, string(hashedPw), req.Tema)

	if err != nil {
		http.Error(w, "Error al crear la cuenta", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Usuario registrado exitosamente"})
}

type LoginRequest struct {
	Correo   string `json:"correo"`
	Password string `json:"password"`
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	var user models.Usuario
	err := db.Pool.QueryRow(context.Background(), `
		SELECT id, nombre, password_hash, tema 
		FROM agenda_app.usuarios 
		WHERE correo = $1
	`, req.Correo).Scan(&user.ID, &user.Nombre, &user.PasswordHash, &user.Tema)

	if err != nil {
		http.Error(w, "Credenciales incorrectas", http.StatusUnauthorized)
		return
	}

	// Comparar contraseñas
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, "Credenciales incorrectas", http.StatusUnauthorized)
		return
	}

	// Devolvemos el usuario (sin el hash)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"agenda-backend/db"
	"agenda-backend/handlers"
	"agenda-backend/logger"
	"agenda-backend/worker"

	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Configuramos el logging con rotación
	logger.SetupLogger()

	// Intentamos cargar .env en la misma carpeta o en Frontend
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../Frontend/.env")

	if err := db.ConnectDB(); err != nil {
		log.Fatalf("Error conectando a la base de datos: %v", err)
	}
	defer db.Pool.Close()

	// Iniciar worker de notificaciones
	worker.StartNotifier()

	mux := http.NewServeMux()

	// Rutas de autenticación
	mux.HandleFunc("POST /api/register", handlers.Register)
	mux.HandleFunc("POST /api/login", handlers.Login)
	
	// Rutas de recordatorios
	mux.HandleFunc("GET /api/reminders", handlers.GetReminders)
	mux.HandleFunc("POST /api/reminders", handlers.CreateReminder)
	mux.HandleFunc("PATCH /api/reminders/{id}", handlers.UpdateReminder)
	mux.HandleFunc("DELETE /api/reminders/{id}", handlers.DeleteReminder)
	mux.HandleFunc("POST /api/reminders/bulk", handlers.BulkActionReminders)
	
	// Push Subscriptions
	mux.HandleFunc("POST /api/push-subscription", handlers.SubscribePush)

	// Rutas de notas
	mux.HandleFunc("GET /api/notas", handlers.GetNotes)
	mux.HandleFunc("POST /api/notas", handlers.CreateNote)
	mux.HandleFunc("PUT /api/notas/{id}", handlers.UpdateNote)
	mux.HandleFunc("DELETE /api/notas/{id}", handlers.DeleteNote)

	// Configuración de CORS dinámica
	// En local: ALLOWED_ORIGINS no está definido → usa fallback
	// En producción: definir ALLOWED_ORIGINS=https://tudominio.com en el .env del servidor
	allowedOrigins := []string{"http://localhost:5173", "http://127.0.0.1:5173"}
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		allowedOrigins = strings.Split(origins, ",")
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Servidor corriendo en http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Error iniciando servidor: %v", err)
	}
}

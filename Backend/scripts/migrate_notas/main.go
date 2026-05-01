package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		log.Fatal("DATABASE_URL no está configurada")
	}

	pool, err := pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		log.Fatalf("Error conectando: %v", err)
	}
	defer pool.Close()

	sql := `
	CREATE TABLE IF NOT EXISTS agenda_app.notas (
	  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	  usuario_id    UUID NOT NULL REFERENCES agenda_app.usuarios(id) ON DELETE CASCADE,
	  titulo        VARCHAR(255) NOT NULL,
	  contenido     TEXT,
	  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_notas_usuario ON agenda_app.notas(usuario_id);
	`

	_, err = pool.Exec(context.Background(), sql)
	if err != nil {
		log.Fatalf("Error ejecutando migración: %v", err)
	}

	fmt.Println("Migración de notas completada correctamente.")
}

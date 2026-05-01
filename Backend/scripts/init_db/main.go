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
	// Intentamos cargar desde el directorio actual o el padre (depende de dónde se ejecute)
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		log.Fatal("DATABASE_URL no está configurada (revisa el archivo .env)")
	}

	pool, err := pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		log.Fatalf("Error conectando: %v", err)
	}
	defer pool.Close()

	sql := `
	CREATE SCHEMA IF NOT EXISTS agenda_app;

	CREATE TABLE IF NOT EXISTS agenda_app.usuarios (
	  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	  nombre        VARCHAR(100) NOT NULL,
	  correo        VARCHAR(255) NOT NULL UNIQUE,
	  password_hash TEXT NOT NULL,
	  tema          VARCHAR(20) NOT NULL DEFAULT 'casino'
	                CHECK (tema IN ('casino', 'floral')),
	  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS agenda_app.recordatorios (
	  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	  usuario_id    UUID NOT NULL REFERENCES agenda_app.usuarios(id) ON DELETE CASCADE,
	  titulo        VARCHAR(255) NOT NULL,
	  descripcion   TEXT,
	  fecha_hora    TIMESTAMPTZ NOT NULL,
	  prioridad     VARCHAR(10) NOT NULL DEFAULT 'media'
	                CHECK (prioridad IN ('baja', 'media', 'muy_alta')),
	  completado    BOOLEAN NOT NULL DEFAULT FALSE,
	  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS agenda_app.notas (
	  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	  usuario_id    UUID NOT NULL REFERENCES agenda_app.usuarios(id) ON DELETE CASCADE,
	  titulo        VARCHAR(255) NOT NULL,
	  contenido     TEXT,
	  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_recordatorios_usuario     ON agenda_app.recordatorios(usuario_id);
	CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha_hora  ON agenda_app.recordatorios(fecha_hora);
	CREATE INDEX IF NOT EXISTS idx_recordatorios_completado  ON agenda_app.recordatorios(completado);
	CREATE INDEX IF NOT EXISTS idx_notas_usuario             ON agenda_app.notas(usuario_id);

	CREATE TABLE IF NOT EXISTS agenda_app.suscripciones_push (
	  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	  usuario_id    UUID NOT NULL REFERENCES agenda_app.usuarios(id) ON DELETE CASCADE,
	  endpoint      TEXT NOT NULL,
	  p256dh        TEXT NOT NULL,
	  auth          TEXT NOT NULL,
	  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	  UNIQUE(usuario_id, endpoint)
	);

	CREATE TABLE IF NOT EXISTS agenda_app.notificaciones (
	  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	  recordatorio_id UUID NOT NULL REFERENCES agenda_app.recordatorios(id) ON DELETE CASCADE,
	  fecha_hora      TIMESTAMPTZ NOT NULL,
	  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('email', 'movil', 'ambas')),
	  enviada         BOOLEAN NOT NULL DEFAULT FALSE,
	  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_notificaciones_recordatorio ON agenda_app.notificaciones(recordatorio_id);
	CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha_hora   ON agenda_app.notificaciones(fecha_hora) WHERE enviada = FALSE;
	`

	_, err = pool.Exec(context.Background(), sql)
	if err != nil {
		log.Fatalf("Error ejecutando SQL: %v", err)
	}

	fmt.Println("Base de datos inicializada correctamente.")
}

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
	-- Eliminar la restricción antigua si existe (pg_constraint suele tener nombres automáticos, pero probamos con el estándar)
	ALTER TABLE agenda_app.usuarios DROP CONSTRAINT IF EXISTS usuarios_tema_check;
	
	-- Añadir la nueva restricción
	ALTER TABLE agenda_app.usuarios ADD CONSTRAINT usuarios_tema_check 
	CHECK (tema IN ('casino', 'floral', 'rosa', 'morado', 'rojo', 'azul'));

	-- Actualizar usuarios existentes (opcional, para que no queden con temas viejos)
	UPDATE agenda_app.usuarios SET tema = 'casino' WHERE tema NOT IN ('casino', 'floral');
	`

	_, err = pool.Exec(context.Background(), sql)
	if err != nil {
		log.Fatalf("Error ejecutando migración: %v", err)
	}

	fmt.Println("Migración de temas completada correctamente.")
}

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
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found")
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	pool, err := pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	_, err = pool.Exec(context.Background(), `
		ALTER TABLE agenda_app.recordatorios 
		ADD COLUMN IF NOT EXISTS ciclo_id UUID REFERENCES agenda_app.recordatorios(id) ON DELETE CASCADE;
	`)
	if err != nil {
		log.Fatalf("Error altering table: %v", err)
	}

	fmt.Println("Migration successful: added ciclo_id to agenda_app.recordatorios")
}

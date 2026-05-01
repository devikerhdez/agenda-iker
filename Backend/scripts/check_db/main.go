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

	var countUsuarios int
	err = pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM agenda_app.usuarios").Scan(&countUsuarios)
	if err != nil {
		log.Fatal(err)
	}

	var countRecordatorios int
	err = pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM agenda_app.recordatorios").Scan(&countRecordatorios)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Usuarios: %d\n", countUsuarios)
	fmt.Printf("Recordatorios: %d\n", countRecordatorios)
}

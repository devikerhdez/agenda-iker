package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func ConnectDB() error {
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		return fmt.Errorf("DATABASE_URL no está configurada")
	}

	pool, err := pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		return err
	}

	Pool = pool
	return nil
}

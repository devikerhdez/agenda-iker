package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"time"
)

const logFile = "app.log"
const rotationPeriod = 48 * time.Hour

// SetupLogger configura el log para escribir en un archivo con rotación cada 2 días
func SetupLogger() {
	shouldRotate := false
	
	info, err := os.Stat(logFile)
	if err == nil {
		// Si el archivo existe, comprobamos su antigüedad
		if time.Since(info.ModTime()) > rotationPeriod {
			shouldRotate = true
		}
	}

	if shouldRotate {
		// Rotamos el archivo: renombramos el actual a .old
		_ = os.Rename(logFile, logFile+".old")
	}

	// Abrimos el archivo (creándolo si no existe, o añadiendo al final si existe)
	// Pero si shouldRotate era true, crearemos uno nuevo.
	f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Printf("Error abriendo archivo de log: %v\n", err)
		return
	}

	// Configuramos el log para escribir en el archivo y también en la consola (stdout)
	multi := io.MultiWriter(os.Stdout, f)
	log.SetOutput(multi)
	
	// Añadimos prefijos estándar
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	
	log.Println("--- Inicio del Servidor (Logging configurado) ---")
}

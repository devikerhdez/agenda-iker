package worker

import (
	"context"
	"log"
	"time"

	"agenda-backend/db"
	"agenda-backend/models"
)

// GenerateCycleInstances generates instances for a given cycle for the given time range.
func GenerateCycleInstances(cycle models.Recordatorio, startDate time.Time, endDate time.Time) error {
	// Find all days in the range that match dias_repeticion
	currentDate := startDate
	for !currentDate.After(endDate) {
		weekday := int(currentDate.Weekday())
		matches := false
		for _, d := range cycle.DiasRepeticion {
			if weekday == d {
				matches = true
				break
			}
		}

		if matches {
			// Check if we already have an instance for this cycle on this exact date
			var exists bool
			err := db.Pool.QueryRow(context.Background(), `
				SELECT EXISTS(
					SELECT 1 FROM agenda_app.recordatorios 
					WHERE ciclo_id = $1 AND DATE(fecha_hora) = DATE($2)
				)
			`, cycle.ID, currentDate).Scan(&exists)

			if err == nil && !exists {
				// Combine the matched date with the time from the cycle template
				instanceTime := time.Date(
					currentDate.Year(), currentDate.Month(), currentDate.Day(),
					cycle.FechaHora.Hour(), cycle.FechaHora.Minute(), cycle.FechaHora.Second(), 0, currentDate.Location(),
				)

				// Insert the instance
				var instanceID string
				err = db.Pool.QueryRow(context.Background(), `
					INSERT INTO agenda_app.recordatorios (usuario_id, titulo, descripcion, fecha_hora, prioridad, es_recurrente, dias_repeticion, ciclo_id)
					VALUES ($1, $2, $3, $4, $5, false, '{}', $6) RETURNING id
				`, cycle.UsuarioID, cycle.Titulo, cycle.Descripcion, instanceTime, cycle.Prioridad, cycle.ID).Scan(&instanceID)

				if err == nil {
					// Copy notifications
					for _, notif := range cycle.Notificaciones {
						// Calculate relative time difference
						diff := notif.FechaHora.Sub(cycle.FechaHora)
						notifInstanceTime := instanceTime.Add(diff)

						_, _ = db.Pool.Exec(context.Background(), `
							INSERT INTO agenda_app.notificaciones (recordatorio_id, fecha_hora, tipo)
							VALUES ($1, $2, $3)
						`, instanceID, notifInstanceTime, notif.Tipo)
					}
				} else {
					log.Printf("Error creating instance for cycle %s: %v", cycle.ID, err)
				}
			}
		}
		currentDate = currentDate.AddDate(0, 0, 1)
	}
	return nil
}

// StartGenerator starts the background job to generate occurrences every Sunday
func StartGenerator() {
	go func() {
		for {
			now := time.Now()
			// Generate for the next 7 days
			startDate := now
			endDate := now.AddDate(0, 0, 7)

			log.Println("Corriendo generador de ciclos...")
			generateAllCycles(startDate, endDate)

			// Wait until next Sunday at 00:00. For simplicity in testing, let's run it every 12 hours.
			// But since the task says "every Sunday", we calculate time until next Sunday.
			daysUntilSunday := int(time.Sunday - now.Weekday())
			if daysUntilSunday <= 0 {
				daysUntilSunday += 7
			}
			nextSunday := time.Date(now.Year(), now.Month(), now.Day()+daysUntilSunday, 0, 1, 0, 0, now.Location())
			sleepDuration := nextSunday.Sub(now)
			log.Printf("Generador dormirá por %v hasta el próximo domingo", sleepDuration)
			time.Sleep(sleepDuration)
		}
	}()
}

func generateAllCycles(startDate time.Time, endDate time.Time) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT id, usuario_id, titulo, descripcion, fecha_hora, prioridad, dias_repeticion
		FROM agenda_app.recordatorios
		WHERE es_recurrente = true
	`)
	if err != nil {
		log.Printf("Error fetching cycles: %v", err)
		return
	}
	defer rows.Close()

	var cycles []models.Recordatorio
	for rows.Next() {
		var cycle models.Recordatorio
		if err := rows.Scan(&cycle.ID, &cycle.UsuarioID, &cycle.Titulo, &cycle.Descripcion, &cycle.FechaHora, &cycle.Prioridad, &cycle.DiasRepeticion); err != nil {
			continue
		}
		
		// Fetch template notifications
		nRows, nErr := db.Pool.Query(context.Background(), `
			SELECT fecha_hora, tipo FROM agenda_app.notificaciones WHERE recordatorio_id = $1
		`, cycle.ID)
		if nErr == nil {
			var notifs []models.Notificacion
			for nRows.Next() {
				var n models.Notificacion
				if err := nRows.Scan(&n.FechaHora, &n.Tipo); err == nil {
					notifs = append(notifs, n)
				}
			}
			nRows.Close()
			cycle.Notificaciones = notifs
		}

		cycles = append(cycles, cycle)
	}

	for _, cycle := range cycles {
		GenerateCycleInstances(cycle, startDate, endDate)
	}
}

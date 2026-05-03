package models

import "time"

type Usuario struct {
	ID           string `json:"id"`
	Nombre       string `json:"nombre"`
	Correo       string `json:"correo"`
	PasswordHash string `json:"-"` // Oculto en JSON
	Tema         string `json:"tema"`
}

type Recordatorio struct {
	ID          string    `json:"id"`
	UsuarioID   string    `json:"usuario_id"`
	Titulo      string    `json:"titulo"`
	Descripcion *string   `json:"descripcion"`
	FechaHora   time.Time `json:"fecha_hora"`
	Prioridad      string         `json:"prioridad"`
	Completado     bool           `json:"completado"`
	CreatedAt      time.Time      `json:"created_at"`
	EsRecurrente   bool           `json:"es_recurrente"`
	DiasRepeticion []int          `json:"dias_repeticion"`
	CicloID        *string        `json:"ciclo_id,omitempty"`
	Notificaciones []Notificacion `json:"notificaciones,omitempty"`
}

type Notificacion struct {
	ID             string    `json:"id,omitempty"`
	RecordatorioID string    `json:"recordatorio_id,omitempty"`
	FechaHora      time.Time `json:"fecha_hora"`
	Tipo           string    `json:"tipo"` // 'email', 'movil', 'ambas'
	Enviada        bool      `json:"enviada"`
}

type SuscripcionPush struct {
	Endpoint string `json:"endpoint"`
	P256dh   string `json:"p256dh"`
	Auth     string `json:"auth"`
}

type Nota struct {
	ID        string    `json:"id"`
	UsuarioID string    `json:"usuario_id"`
	Titulo    string    `json:"titulo"`
	Contenido *string   `json:"contenido"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

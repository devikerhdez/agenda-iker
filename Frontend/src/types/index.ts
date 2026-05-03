export type Tema = 'casino' | 'floral';
export type Prioridad = 'baja' | 'media' | 'muy_alta';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  password_hash: string;
  tema: Tema;
  creado_en: string; // ISO string
}

export interface Notificacion {
  id?: string;
  recordatorio_id?: string;
  fecha_hora: string; // ISO string
  tipo: 'email' | 'movil' | 'ambas';
  enviada?: boolean;
}

export interface Recordatorio {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion?: string | null;
  fecha_hora: string; // ISO string
  prioridad: Prioridad;
  completado: boolean;
  creado_en: string; // ISO string
  es_recurrente?: boolean;
  dias_repeticion?: number[];
  ciclo_id?: string | null;
  notificaciones?: Notificacion[];
}

export interface Nota {
  id: string;
  usuario_id: string;
  titulo: string;
  contenido?: string | null;
  created_at: string;
  updated_at: string;
}

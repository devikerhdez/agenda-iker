# 📋 Agenda App — Especificación del Proyecto

## Stack Tecnológico

- **Frontend:** React + TypeScript
- **Estilos:** Tailwind CSS
- **Base de datos:** NeonDB (PostgreSQL serverless)
- **PWA:** Sí (con notificaciones push vía Service Workers)
- **Despliegue:** Netlify (cron jobs en plan gratuito para notificaciones)
- **Backend:** No hay backend dedicado — acceso directo a NeonDB desde el cliente

---

## Esquema de Base de Datos

**Esquema:** `agenda_app`

### Sentencias SQL

```sql
-- Crear el esquema
CREATE SCHEMA IF NOT EXISTS agenda_app;

-- ─────────────────────────────────────────
-- TABLA: usuarios
-- ─────────────────────────────────────────
CREATE TABLE agenda_app.usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(100) NOT NULL,
  correo        VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                          -- bcrypt antes de guardar
  tema          VARCHAR(20) NOT NULL DEFAULT 'morado'   -- 'rosa' | 'morado' | 'rojo' | 'azul'
                CHECK (tema IN ('rosa', 'morado', 'rojo', 'azul')),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLA: recordatorios
-- ─────────────────────────────────────────
CREATE TABLE agenda_app.recordatorios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES agenda_app.usuarios(id) ON DELETE CASCADE,
  titulo        VARCHAR(255) NOT NULL,
  descripcion   TEXT,
  fecha_hora    TIMESTAMPTZ NOT NULL,                   -- fecha y hora del recordatorio
  prioridad     VARCHAR(10) NOT NULL DEFAULT 'media'
                CHECK (prioridad IN ('baja', 'media', 'muy_alta')),
  completado    BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar consultas frecuentes
CREATE INDEX idx_recordatorios_usuario     ON agenda_app.recordatorios(usuario_id);
CREATE INDEX idx_recordatorios_fecha_hora  ON agenda_app.recordatorios(fecha_hora);
CREATE INDEX idx_recordatorios_completado  ON agenda_app.recordatorios(completado);
```

---

## Arquitectura de Páginas / Rutas

### `/` → Redirige según sesión
- Si hay sesión activa → `/dashboard`
- Si no hay sesión → `/login`

---

### `/login` — Pantalla de Login

**Campos:**
- Correo electrónico
- Contraseña

**Lógica:**
- Buscar usuario por correo en `agenda_app.usuarios`
- Comparar contraseña con `bcrypt.compare()`
- Si válido → guardar sesión (localStorage/sessionStorage con JWT o token simple) → redirigir a `/dashboard`

**UI:**
- Enlace a `/registro` para crear cuenta nueva

---

### `/registro` — Crear Cuenta

**Campos:**
- Nombre
- Correo electrónico
- Contraseña (se encripta con `bcrypt` antes de guardar)
- Selección de tema visual (4 opciones): `rosa`, `morado`, `rojo`, `azul`

**Lógica:**
- Validar que el correo no exista ya en la base de datos
- Hashear contraseña con `bcrypt` (salt rounds: 10)
- Insertar en `agenda_app.usuarios`
- Redirigir a `/login` al completar el registro

---

### `/dashboard` — Panel Principal (ruta protegida)

#### Header
- Nombre de la app (logo/icono)
- Mensaje de bienvenida: `"¡Hola, {nombre}! 👋"`
- Botón de cerrar sesión (limpia la sesión y redirige a `/login`)

#### Sección 1 — Recordatorios Pendientes (vista lista)
- Muestra los recordatorios donde `completado = FALSE`
- Ordenados por `fecha_hora ASC` (más próximos primero)
- Indicador visual de prioridad por color:
  - `baja` → verde
  - `media` → amarillo/naranja
  - `muy_alta` → rojo
- Cada recordatorio muestra: título, fecha/hora relativa (ej. "en 2 horas", "mañana"), prioridad
- Botón **"+ Nuevo recordatorio"** que abre un modal/drawer

#### Sección 2 — Calendario
- Vista de calendario mensual
- Los días con recordatorios muestran un indicador (punto o badge)
- Al hacer clic en un día concreto → panel lateral o modal que lista los recordatorios de ese día
- Botón **"+ Nuevo"** dentro de la vista de día para crear un recordatorio con esa fecha preseleccionada

#### Modal / Drawer — Crear Recordatorio
**Campos del formulario:**
- Título *(requerido)*
- Descripción *(opcional)*
- Fecha y hora *(requerido, date-time picker)*
- Prioridad *(selector: baja / media / muy alta)*

---

## Temas Visuales

Cada tema aplica una paleta diferente al diseño de la app. Se guarda en `agenda_app.usuarios.tema` y se aplica dinámicamente con clases de Tailwind o CSS variables.

| Tema    | Color primario | Acento        | Notas de diseño              |
|---------|---------------|---------------|------------------------------|
| `rosa`  | `#F472B6`     | `#EC4899`     | Gradientes suaves, redondeado |
| `morado`| `#A855F7`     | `#7C3AED`     | Glassmorphism, sombras       |
| `rojo`  | `#EF4444`     | `#DC2626`     | Bold, contrastes fuertes     |
| `azul`  | `#3B82F6`     | `#2563EB`     | Clean, minimalista moderno   |

---

## Notas de Implementación

### Contraseñas
- Usar `bcrypt` (librería `bcryptjs` compatible con browser/edge)
- **Nunca** guardar la contraseña en texto plano
- Hash se genera en el cliente antes del INSERT (al no haber backend)

### Conexión a NeonDB
- Usar el driver `@neondatabase/serverless` con WebSockets habilitados
- La cadena de conexión se guarda en `.env` como `VITE_DATABASE_URL`
- ⚠️ **Nota de seguridad:** al no haber backend, la connection string queda expuesta en el bundle. Para una app personal esto es aceptable, pero considerar restringir el acceso al rol de base de datos solo a las tablas de `agenda_app`

### PWA y Notificaciones
- Registrar un Service Worker para notificaciones push
- Netlify Scheduled Functions (cron) para disparar recordatorios según `fecha_hora`
- Solicitar permiso de notificaciones al usuario tras el primer login

### Gestión de Sesión
- Guardar `usuario_id` y `nombre` en `localStorage` tras login exitoso
- Leer el tema del usuario y aplicar la clase de tema al `<body>` o al root de React
- Las rutas protegidas comprueban si existe la sesión antes de renderizar

---

## Estructura de Carpetas Sugerida

```
src/
├── components/
│   ├── ui/               # Componentes base (Button, Input, Modal...)
│   ├── Calendar.tsx
│   ├── ReminderCard.tsx
│   └── ReminderForm.tsx
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   └── Dashboard.tsx
├── lib/
│   ├── db.ts             # Cliente NeonDB
│   ├── auth.ts           # bcrypt, sesión
│   └── theme.ts          # Aplicar tema dinámico
├── hooks/
│   └── useSession.ts
├── types/
│   └── index.ts          # Tipos TS: Usuario, Recordatorio, Prioridad, Tema
└── main.tsx
```
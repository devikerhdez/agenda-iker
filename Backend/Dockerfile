# ─── Stage 1: Build ───────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para CGO (si aplica)
RUN apk --no-cache add ca-certificates git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Compilar binario estático
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o agenda-backend .

# ─── Stage 2: Runtime ─────────────────────────────────────────────
FROM alpine:latest

# Certificados SSL para conexiones externas (NeonDB, email, etc.)
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/agenda-backend .

EXPOSE 8080

CMD ["./agenda-backend"]

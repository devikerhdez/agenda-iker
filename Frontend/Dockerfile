# ─── Stage 1: Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# VITE_API_URL se inyecta en build-time via docker-compose
# En local no se usa este Dockerfile, así que el fallback de api.ts cubre eso
ARG VITE_API_URL=http://212.227.227.231:8080/api
ARG VITE_VAPID_PUBLIC_KEY=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

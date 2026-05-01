🚀 Instrucciones de Configuración: Despliegue Automatizado (Go + Docker)
Este documento contiene los requerimientos técnicos para configurar el VPS de IONOS y permitir un flujo de trabajo basado en GitHub Actions (Push-to-Deploy).

1. Información del Servidor
IP del Servidor: 212.227.227.231

Sistema Operativo: Ubuntu 24.04 LTS

Usuario: root

2. Preparación del Entorno (Stack Tecnológico)
Por favor, realiza las siguientes instalaciones y configuraciones:

Docker & Docker Compose: Instalar el motor de Docker y el plugin de Compose para gestionar las apps de forma aislada.

Firewall (UFW): Configurar reglas para permitir tráfico en los puertos:

22/tcp (SSH)

80/tcp (HTTP)

443/tcp (HTTPS)

81/tcp (Admin de Nginx Proxy Manager)

3. Gestión de Proxy y SSL
Levantar un contenedor de Nginx Proxy Manager.

Propósito: Permitir al usuario mapear dominios a contenedores Docker y gestionar certificados SSL (Let's Encrypt) de forma visual.

Acceso: Configurar el panel de administración en el puerto 81.

4. Estructura de Aplicaciones
Organizar el despliegue en la ruta /root/apps/:

backend/: Código fuente del repositorio de Go.

frontend/: Archivos estáticos o contenedor de Node.js según corresponda.

5. Configuración de CI/CD (GitHub Actions)
El usuario ya ha configurado una Deploy Key pública en el repositorio de GitHub.

Acción requerida: Configurar un Workflow de GitHub Actions que, ante un push en la rama main, realice lo siguiente:

Conexión vía SSH al servidor.

git pull de los últimos cambios.

docker compose up -d --build.

Secretos: El agente deberá solicitar al usuario el contenido de la SSH Private Key (~/.ssh/id_rsa) para configurarlo en los Secrets del repositorio como SSH_PRIVATE_KEY.

6. Dockerización del Backend (Go)
Para el proyecto de Go, se requiere un Dockerfile optimizado (multi-stage build) que:

Compile en una imagen golang:alpine.

Ejecute el binario en una imagen alpine mínima para ahorrar recursos del VPS M+ (4GB RAM).

¿Qué debe hacer el usuario después?
Una vez que el agente confirme la configuración, el usuario solo tendrá que:

Añadir la Private Key proporcionada por el servidor en los Secrets de su GitHub.

Realizar un git push para ver su aplicación desplegada automáticamente.
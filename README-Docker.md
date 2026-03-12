# Real Estate Manager - Docker Setup

Esta aplicación está dockerizada con tres servicios principales: PostgreSQL, Node.js backend y Angular frontend.

## Requisitos Previos

- Docker
- Docker Compose

## Cómo Ejecutar la Aplicación

1. **Clona el repositorio** (si no lo has hecho ya):
   ```bash
   git clone <repository-url>
   cd real-estatement-manager
   ```

2. **Ejecuta la aplicación completa con un solo comando**:
   ```bash
   docker-compose up --build
   ```

   Este comando:
   - Construirá las imágenes de Docker para el backend y frontend
   - Iniciará PostgreSQL con la base de datos
   - Ejecutará automáticamente el esquema de la base de datos
   - Iniciará el backend en el puerto 3000
   - Iniciará el frontend en el puerto 80

3. **Accede a la aplicación**:
   - Frontend: http://localhost
   - Backend API: http://localhost:3000
   - Base de datos: localhost:5432 (desde fuera de Docker)

## Servicios

### PostgreSQL
- **Imagen**: postgres:15-alpine
- **Base de datos**: real_statement_manager
- **Usuario**: postgres
- **Contraseña**: postgres123
- **Puerto**: 5432

### Backend (Node.js)
- **Puerto**: 3000
- **Entorno**: production
- **Base de datos**: Conecta automáticamente a PostgreSQL

### Frontend (Angular)
- **Puerto**: 80
- **Proxy**: Las llamadas a `/api/*` se redirigen al backend

## Comandos Útiles

### Ejecutar en segundo plano
```bash
docker-compose up -d --build
```

### Ver logs
```bash
docker-compose logs -f
```

### Detener la aplicación
```bash
docker-compose down
```

### Detener y eliminar volúmenes (datos de la base de datos)
```bash
docker-compose down -v
```

### Reconstruir imágenes
```bash
docker-compose up --build --force-recreate
```

## Estructura de Archivos

```
.
├── docker-compose.yml      # Orquestación de servicios
├── .env                    # Variables de entorno globales
├── backend/
│   ├── Dockerfile         # Imagen del backend
│   ├── .env              # Variables del backend
│   └── src/              # Código fuente
├── frontend/
│   ├── Dockerfile        # Imagen del frontend
│   ├── nginx.conf        # Configuración de Nginx
│   └── src/              # Código fuente Angular
├── init-db.sh            # Script de inicialización de BD
└── README-Docker.md      # Este archivo
```

## Notas Importantes

- La base de datos se inicializa automáticamente con el esquema definido en `backend/src/models/schema.sql`
- Los uploads se persisten en el volumen `backend/uploads`
- Los datos de PostgreSQL se almacenan en un volumen Docker llamado `postgres_data`
- El frontend está configurado para proxy las llamadas API al backend

## Desarrollo

Si deseas desarrollar con hot-reload:

1. Para el backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Para el frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Base de datos local (fuera de Docker):
   - Instala PostgreSQL localmente
   - Crea la base de datos `real_statement_manager`
   - Ejecuta el esquema desde `backend/src/models/schema.sql`
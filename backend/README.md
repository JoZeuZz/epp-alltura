# Backend Alltura EPP Control

API de Alltura EPP Control para gestionar autenticación, inventario, entregas, devoluciones, firmas, egresos, proveedores, ubicaciones y trazabilidad.

## Stack Técnico

- Node.js + Express 5.
- PostgreSQL con driver pg (sin ORM).
- Redis para componentes operativos (por ejemplo, soporte a autenticación/estado temporal).
- Joi para validación de entrada.
- JWT (access + refresh).
- Middleware de seguridad: helmet, cors, hpp, sanitización y manejo de errores centralizado.

## Arquitectura

Estructura por capas:

- routes: definición de endpoints y validaciones de entrada.
- controllers: capa HTTP.
- services: reglas de negocio y coordinación transaccional.
- db/lib: acceso a datos, utilidades y librerías comunes.

## Setup Rápido

### 1) Instalar dependencias

```bash
npm install
```

### 2) Configurar variables de entorno mínimas

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=55432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=herramientas

REDIS_URL=redis://localhost:56379

JWT_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me_too

CLIENT_URL=http://localhost:3000
SERVICE_URL_FRONTEND=http://localhost:3000
SERVICE_FQDN_FRONTEND=localhost:3000
```

### 3) Levantar infraestructura local (desde raíz del repo)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4) Ejecutar API

```bash
npm run dev
```

API por defecto en: http://localhost:5000

## Scripts Disponibles

```bash
# Ejecución
npm start
npm run dev

# Calidad
npm run lint

# Testing
npm test
npm run test:watch
npm run test:coverage
npm run test:verbose
npm run test:services
npm run test:integration-db
npm run test:lib

# Utilidades
npm run create-admin
npm run generate-secrets
npm run migrate:security
```

## Endpoints y Módulos (alto nivel)

- auth
- users
- dashboard
- articulos
- inventario
- compras
- entregas
- devoluciones
- firmas
- proveedores
- trabajadores
- ubicaciones
- notifications

Todos bajo prefijo /api.

## Reglas de Dominio Importantes

- tracking_mode permitido: serial o lote.
- Cantidades físicas enteras en operaciones críticas.
- Custodia activa única por activo serial.

Estas reglas están reforzadas por validaciones en rutas/servicios y por SQL en db/init.

## Seed de Desarrollo

Con inicialización en entorno local, db/init/009-dev-seed.sql crea dataset demo para pruebas manuales con usuarios de distintos roles.

Credenciales demo típicas:

- admin.dev@alltura.local
- bodega.dev@alltura.local
- supervisor.dev@alltura.local
- juan.herrera@alltura.local
- maria.rojas@alltura.local

Password demo: Dev12345!

## Operación y Observabilidad

- Health endpoints: /health, /health/live, /health/ready.
- Logging estructurado con requestId.
- Error handler global al final del pipeline de middlewares.

## Notas Operativas

- Revisar trust proxy según topología real de despliegue.
- Mantener sincronía entre rutas reales y documentación OpenAPI/Swagger.
- Para cambios SQL o flujos críticos, ejecutar test de integración DB antes de merge.

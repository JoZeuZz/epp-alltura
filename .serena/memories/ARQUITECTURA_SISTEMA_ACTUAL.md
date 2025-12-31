# Arquitectura del Sistema Alltura - Estado Actual

## Descripción General
Sistema de gestión de andamios persistentes con tracking completo, control de estados dual, auditoría y roles RBAC.

## Stack Tecnológico

### Backend
- **Framework:** Node.js v16+ con Express.js
- **Lenguaje:** JavaScript (CommonJS)
- **Base de Datos:** PostgreSQL v14+
- **Cache/Blacklist:** Redis v6+
- **Almacenamiento:** Google Cloud Storage

### Frontend
- **Framework:** React v18+
- **Lenguaje:** TypeScript (TSX)
- **Build Tool:** Vite
- **Estilos:** Tailwind CSS v3+
- **Estado:** React Query + Context API
- **PWA:** Service Worker habilitado

## Modelo de Datos (5 Entidades)

### 1. users
Usuarios del sistema con roles embebidos
- **Roles:** admin | supervisor | client
- **Campos:** id, first_name, last_name, email, password_hash, role, rut, phone_number, profile_picture_url

### 2. clients
Empresas mandantes (quienes contratan los servicios)
- **Campos:** id, name (unique), contact_info

### 3. projects
Proyectos de las empresas
- **Campos:** id, client_id (FK), name, status, assigned_client_id (FK users), assigned_supervisor_id (FK users)
- **Estados:** active | inactive | completed

### 4. scaffolds
Andamios persistentes (núcleo del sistema)
- **Identificación:** scaffold_number, area, tag
- **Dimensiones:** width, length, height, cubic_meters (calculado)
- **Estados Dual:**
  - **card_status:** green | red
  - **assembly_status:** assembled | disassembled
- **Progreso:** progress_percentage (0-100)
- **Imágenes:** assembly_image_url (obligatoria), disassembly_image_url (obligatoria al desarmar)
- **Relaciones:** project_id, user_id, created_by

### 5. scaffold_history
Auditoría completa de cambios
- **Campos:** scaffold_id, user_id, change_type, previous_data (jsonb), new_data (jsonb), description

## Arquitectura de Capas

### Backend (MVC)
```
/backend/src
├── index.js              # Entry point, Express app
├── db/                   # Database setup y migrations
├── models/               # 5 modelos de datos
├── routes/               # API endpoints
├── middleware/           # Auth, RBAC, validators
├── lib/                  # Utilities (PDF, Excel, push)
└── scripts/              # Admin creation, logs cleanup
```

### Frontend (Component-Based)
```
/frontend/src
├── App.tsx               # Routing principal
├── pages/                # Páginas por rol
│   ├── admin/            # AdminDashboard, ProjectsPage, etc.
│   ├── supervisor/       # SupervisorDashboard, ProjectScaffoldsPage
│   └── shared/           # NewReportPage, ReportViewerPage
├── components/           # Componentes reutilizables
├── layouts/              # AppLayout con navegación RBAC
├── services/             # API clients (axios)
└── context/              # AuthContext, estado global
```

## Sistema de Seguridad

### Autenticación JWT
- **Access Token:** 15 minutos (corta duración)
- **Refresh Token:** 7 días (almacenado en Redis)
- **Blacklist:** Redis con expiración automática
- **Password Policy:** NIST SP 800-63B (min 12 chars)

### Protecciones
- Rate Limiting: 5 intentos / 15 min
- Brute Force Detection: IP + user-agent
- CSP Headers: Estricta
- Input Validation: Joi (backend) + Zod (frontend)
- SQL Injection: Prepared statements
- XSS: DOMPurify sanitization

### Headers de Seguridad
- HSTS: 1 año max-age
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Permissions-Policy: restrictiva

## Roles y Permisos (RBAC)

### Admin
- **Acceso:** Total
- **Funcionalidades:** CRUD completo, dashboard global, gestión de usuarios/proyectos/clientes
- **Rutas:** /admin/*

### Supervisor
- **Acceso:** Proyectos asignados
- **Funcionalidades:** Crear/editar andamios propios, cambiar estados, dashboard filtrado
- **Rutas:** /supervisor/*
- **Optimización:** Interfaz móvil

### Client
- **Acceso:** Solo visualización
- **Funcionalidades:** Ver andamios de proyectos asignados, historial
- **Rutas:** Limitadas

## Flujo de Datos Principal

### Creación de Andamio
1. Supervisor crea scaffold con imagen (FormData)
2. Backend valida dimensions, calcula cubic_meters
3. Imagen se sube a GCS
4. Scaffold se crea en DB con assembly_status='assembled'
5. Entrada automática en scaffold_history
6. Frontend actualiza cache (React Query)

### Cambio de Estado
1. Usuario cambia card_status o assembly_status
2. Backend verifica permisos (solo propietario o admin)
3. Validación de reglas de negocio (assembled = 100% progress)
4. Registro en history con previous_data y new_data
5. Notificación en tiempo real (opcional)

## API Principales

### Autenticación
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

### Scaffolds
- GET /api/scaffolds (filtrado por rol)
- GET /api/scaffolds/project/:projectId
- POST /api/scaffolds (FormData)
- PATCH /api/scaffolds/:id/card-status
- PATCH /api/scaffolds/:id/assembly-status
- GET /api/scaffolds/:id/history

### Dashboard
- GET /api/dashboard/summary (admin)
- GET /api/supervisor-dashboard/summary (supervisor)

### Reportes
- GET /api/projects/:id/report/pdf
- GET /api/projects/:id/report/excel

## Reglas de Negocio Críticas

1. **Assembled scaffold DEBE tener progress_percentage = 100**
2. **Disassembled scaffold REQUIERE disassembly_image**
3. **Supervisor solo edita sus propios scaffolds**
4. **Admin puede editar cualquier scaffold**
5. **Todo cambio se registra en history**
6. **Dimensiones: 0-100 metros**
7. **Imágenes: max 5MB, JPG/PNG/WEBP**

## Monorepo Scripts

### Raíz
- `npm run dev` - Backend + frontend simultáneos
- `npm run install:all` - Instalar todas las dependencias
- `npm run db:up` - Docker compose PostgreSQL

### Backend
- `npm run dev` - Nodemon con hot reload
- `node src/db/setup.js` - Migración completa
- `node src/scripts/create-admin.js` - Crear admin CLI

### Frontend
- `npm run dev` - Vite dev server
- `npm run build` - Build de producción
- `npm run preview` - Preview de build

## Estado de Seguridad
- **Nivel:** Enterprise-Grade
- **Fase Completada:** FASE 3 (Input Validation)
- **Vulnerabilidades Remediadas:** 14 de 28 (50%)
- **Documentación:** /docs/SECURITY_AUDIT_REPORT.md

## Cambios Recientes (Diciembre 2025)

### Reestructuración Completa (7 Fases)
- Cambio de "reports temporales" a "scaffolds persistentes"
- Eliminación de modelos redundantes (company, endUser, supervisor)
- Consolidación en tabla users con roles
- Sistema de estados dual implementado
- Historial completo con auditoría

### Migración Terminológica
- "technician" → "supervisor" (50+ archivos)
- Rutas: /tech/* → /supervisor/*
- Variables: techId, techLinks, techPassword → supervisor*
- Componentes: TechDashboard → SupervisorDashboard
- API: /api/tech-dashboard → /api/supervisor-dashboard

## Próximos Pasos
- Completar fases 4-8 de seguridad
- Implementar notificaciones push
- Geolocalización de andamios
- App móvil nativa

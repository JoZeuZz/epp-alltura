# Alltura - Sistema de Gestión de Andamios Persistentes

> **Aplicación Web Progresiva (PWA) para la gestión integral de andamios con seguimiento en tiempo real, control de estados y auditoría completa.**

[![Estado de Seguridad](https://img.shields.io/badge/Seguridad-Enterprise--Grade-green)](./docs/SECURITY_AUDIT_REPORT.md)
[![Versión](https://img.shields.io/badge/Versión-2.1.0-blue)]()
[![Node.js](https://img.shields.io/badge/Node.js-v16+-green)]()
[![React](https://img.shields.io/badge/React-v18+-blue)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14+-blue)]()

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Características Principales](#-características-principales)
- [Estado de Seguridad](#-estado-de-seguridad)
- [Arquitectura](#-arquitectura-y-tecnologías)
- [Modelo de Datos](#-modelo-de-datos)
- [Roles y Permisos](#-roles-y-permisos)
- [Instalación](#-instalación-y-configuración)
- [Scripts Disponibles](#-scripts-disponibles)
- [Documentación](#-documentación)

---

## 🎯 Descripción General

**Alltura** es una aplicación web empresarial diseñada para digitalizar y centralizar la gestión de andamios en proyectos de construcción. El sistema reemplaza el proceso manual de reportes vía WhatsApp por una plataforma profesional con:

- **Gestión de Andamios Persistentes**: Control completo del ciclo de vida de cada andamio
- **Sistema de Estados Dual**: Estado de tarjeta (verde/roja) + Estado de armado (armado/desarmado)
- **Tracking Completo**: Historial de todos los cambios con auditoría
- **Control de Acceso Basado en Roles (RBAC)**: Admin, Supervisor, Cliente
- **Dashboard en Tiempo Real**: Métricas de metros cúbicos, estados y progreso
- **Generación de Reportes**: PDF y Excel con datos completos

### Cambio de Paradigma

**De:** Sistema de reportes temporales (crear y olvidar)  
**A:** Sistema de andamios persistentes (crear, monitorear, actualizar, auditar)

---

## ✨ Características Principales

### 🏗️ Gestión de Andamios

- **Creación con Imagen Obligatoria**: Todo andamio inicia con fotografía de montaje
- **Dimensiones y Cálculo Automático**: Ancho, largo, alto → metros cúbicos
- **Estados Duales**:
  - **Tarjeta**: Verde (seguro) / Roja (requiere atención)
  - **Armado**: Armado (100% progreso) / Desarmado (con foto obligatoria)
- **Campos Personalizables**: Número de andamio, área, TAG, ubicación, observaciones
- **Progreso Dinámico**: Porcentaje de avance con validaciones

### 📊 Dashboard y Métricas

- Metros cúbicos totales (armados vs desarmados)
- Distribución de tarjetas (verdes vs rojas)
- Proyectos activos y estadísticas
- Filtrado por proyecto, supervisor, cliente
- Exportación a PDF/Excel

### 🔍 Historial y Auditoría

- Registro automático de todos los cambios
- Tracking de quién, qué y cuándo
- Vista de timeline con detalles expandibles
- Datos anteriores vs nuevos (diff visual)

### 👥 Gestión de Usuarios y Proyectos

- CRUD completo de usuarios con roles
- Asignación de supervisores a proyectos
- Asignación de clientes a proyectos
- Gestión de empresas mandantes (clients)

### 📱 Interfaz Responsive

- Optimizada para móviles (supervisores en terreno)
- Dashboard completo para escritorio (admin)
- PWA con capacidades offline
- Carga de imágenes con compresión automática

---

## 🔒 Estado de Seguridad

**Nivel de Seguridad:** 🟢 **ENTERPRISE-GRADE**  
**Última Auditoría:** 10 de diciembre de 2025  
**Vulnerabilidades Remediadas:** 14 de 28 (50% reducción)

### Fases de Seguridad Completadas

- ✅ **FASE 1:** Security Audit (28 vulnerabilidades identificadas)
- ✅ **FASE 2:** Authentication Hardening (9 vulnerabilidades remediadas)
- ✅ **FASE 3:** Input Validation & Sanitization (5 vulnerabilidades remediadas)
- ⏳ **FASE 4-8:** En progreso

### Protecciones Implementadas

#### 🔐 Autenticación & Autorización
- JWT con tokens de corta duración (15 min) + refresh tokens (7 días)
- Redis para blacklist persistente de tokens
- Passwords según NIST SP 800-63B (mínimo 12 caracteres, breach checking)
- Protección contra brute force (5 intentos / 15 minutos)
- Detección de anomalías (múltiples IPs, cambios de user-agent)

#### 🛡️ Validación & Sanitización
- Content Security Policy (CSP) estricta
- Sanitización automática con DOMPurify
- Validación de esquemas con Joi (100% endpoints)
- Prepared statements en todas las queries SQL
- Protección contra XSS, SQL Injection, NoSQL Injection

#### 🌐 Headers de Seguridad
- HSTS con 1 año de max-age
- X-Frame-Options (previene clickjacking)
- Permissions-Policy (deshabilita APIs peligrosas)
- X-Content-Type-Options (previene MIME sniffing)
- X-XSS-Protection habilitado

📄 **Documentación Completa:**
- [Security Audit Report](./docs/SECURITY_AUDIT_REPORT.md)
- [Authentication Hardening](./docs/PHASE_2_AUTHENTICATION_HARDENING.md)
- [Input Validation](./docs/PHASE_3_INPUT_VALIDATION.md)

---

## 🏛️ Arquitectura y Tecnologías

### Backend

**Framework:** Node.js v16+ con Express.js  
**Lenguaje:** JavaScript (CommonJS)  
**Base de Datos:** PostgreSQL v14+  

**Seguridad:**
- JWT (jsonwebtoken)
- bcryptjs (hashing de passwords)
- Redis (blacklist de tokens)
- Helmet (headers de seguridad)
- Joi (validación de esquemas)

**Almacenamiento:**
- Google Cloud Storage (imágenes)

**Generación de Documentos:**
- pdfkit (reportes PDF)
- exceljs (reportes Excel)

**Logging:**
- Winston (logs estructurados)
- Morgan (logs de acceso HTTP)

### Frontend

**Framework:** React v18+  
**Lenguaje:** TypeScript (TSX)  
**Estilos:** Tailwind CSS v3+  
**Build:** Vite  

**Estado y Datos:**
- React Query (cache y sincronización)
- Context API (estado global)
- Axios (cliente HTTP)

**PWA:**
- manifest.json
- Service Worker
- Capacidades offline

**Validación:**
- React Hook Form
- Zod (esquemas TypeScript)

### DevOps

**Contenedorización:**
- Docker
- Docker Compose

**Scripts:**
- npm workspaces (monorepo)
- concurrently (desarrollo simultáneo)

---

## 💾 Modelo de Datos

### Entidades Principales

#### 1. **users** - Usuarios del Sistema
**Roles:** `admin`, `supervisor`, `client`

```typescript
{
  id: number;
  first_name: string;
  last_name: string;
  email: string (unique);
  password_hash: string;
  role: 'admin' | 'supervisor' | 'client';
  rut?: string;
  phone_number?: string;
  profile_picture_url?: string;
  created_at: timestamp;
}
```

#### 2. **clients** - Empresas Mandantes
Empresas que contratan los servicios

```typescript
{
  id: number;
  name: string (unique);
  contact_info?: text;
  created_at: timestamp;
}
```

#### 3. **projects** - Proyectos
Proyectos de las empresas mandantes

```typescript
{
  id: number;
  client_id: number; // FK → clients
  name: string;
  status: 'active' | 'inactive' | 'completed';
  assigned_client_id?: number; // FK → users (role='client')
  assigned_supervisor_id?: number; // FK → users (role='supervisor')
  created_at: timestamp;
}
```

#### 4. **scaffolds** - Andamios Persistentes
Núcleo del sistema

```typescript
{
  id: number;
  project_id: number; // FK → projects
  user_id: number; // FK → users (usuario asociado)
  created_by: number; // FK → users (supervisor creador)
  
  // Identificación
  scaffold_number?: string;
  area?: string;
  tag?: string;
  
  // Dimensiones
  width: decimal;
  length: decimal;
  height: decimal;
  cubic_meters: decimal; // Calculado: width × length × height
  
  // Progreso y Estados
  progress_percentage: integer (0-100);
  card_status: 'green' | 'red';
  assembly_status: 'assembled' | 'disassembled';
  
  // Imágenes
  assembly_image_url: string; // Obligatoria al crear
  disassembly_image_url?: string; // Obligatoria al desarmar
  
  // Información adicional
  location?: text;
  observations?: text;
  assembly_notes?: text;
  disassembly_notes?: text;
  
  // Timestamps
  assembly_created_at: timestamp;
  updated_at: timestamp;
  disassembled_at?: timestamp;
}
```

#### 5. **scaffold_history** - Historial de Cambios
Auditoría completa de modificaciones

```typescript
{
  id: number;
  scaffold_id: number; // FK → scaffolds
  user_id: number; // FK → users (quien hizo el cambio)
  change_type: string; // 'created', 'updated', 'card_status_changed', etc.
  previous_data: jsonb; // Estado anterior
  new_data: jsonb; // Estado nuevo
  description: text; // Descripción legible
  created_at: timestamp;
}
```

### Diagrama de Relaciones

```
┌─────────────┐
│   clients   │ (Empresas mandantes)
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐      ┌──────────────┐
│  projects   │◄─────┤    users     │
│             │      │              │
│ client_id   │      │ • admin      │
│ assigned_   │      │ • supervisor │
│ client_id   │      │ • client     │
│ assigned_   │      │              │
│ supervisor  │      └──────┬───────┘
│ _id         │             │
└──────┬──────┘             │
       │ 1:N                │ 1:N
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│  scaffolds  │      │   scaffold   │
│             │◄─────┤   _history   │
│ project_id  │      │              │
│ user_id     │      │ scaffold_id  │
│ created_by  │      │ user_id      │
│ card_status │      │ change_type  │
│ assembly_   │      │ previous_data│
│ status      │      │ new_data     │
└─────────────┘      └──────────────┘
```

---

## 👥 Roles y Permisos

### Matriz de Permisos

| Acción | Admin | Supervisor | Client |
|--------|-------|------------|--------|
| Ver todos los andamios | ✅ | ❌ | ❌ |
| Ver andamios propios | ✅ | ✅ | ❌ |
| Ver andamios de proyectos asignados | ✅ | ✅ | ✅ |
| Crear andamio | ✅ | ✅ | ❌ |
| Editar andamio propio | ✅ | ✅ | ❌ |
| Editar cualquier andamio | ✅ | ❌ | ❌ |
| Eliminar andamio | ✅ | ❌ | ❌ |
| Cambiar estado de tarjeta | ✅ | ✅* | ❌ |
| Cambiar estado de armado | ✅ | ✅* | ❌ |
| Ver historial de cambios | ✅ | ✅ | ✅ |
| Eliminar entrada de historial | ✅ | ❌ | ❌ |
| Gestionar proyectos | ✅ | ❌ | ❌ |
| Asignar usuarios a proyectos | ✅ | ❌ | ❌ |
| Ver dashboard de métricas | ✅ | ✅** | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Gestionar empresas mandantes | ✅ | ❌ | ❌ |
| Exportar reportes PDF/Excel | ✅ | ✅** | ❌ |

\* Solo en andamios propios  
\*\* Solo de proyectos asignados

### Descripción de Roles

#### 🔴 Administrador (Admin)
**Acceso:** Completo  
**Funcionalidades:**
- Gestión total del sistema
- CRUD de usuarios, proyectos, clientes
- Asignación de supervisores y clientes a proyectos
- Ver y editar todos los andamios
- Dashboard global con métricas
- Exportación de reportes completos
- Gestión de auditoría

**Interfaz:** Dashboard de escritorio completo

#### 🟡 Supervisor
**Acceso:** Proyectos asignados  
**Funcionalidades:**
- Crear andamios en proyectos asignados
- Editar sus propios andamios
- Cambiar estados (tarjeta y armado)
- Ver historial de cambios
- Dashboard de sus proyectos
- Exportar reportes de sus andamios

**Interfaz:** Optimizada para móvil (trabajo en terreno)

#### 🟢 Cliente
**Acceso:** Solo visualización  
**Funcionalidades:**
- Ver andamios de proyectos asignados
- Ver historial de cambios
- Ver métricas de proyectos asignados
- Visualizar imágenes y detalles

**Interfaz:** Vista de solo lectura simplificada

---

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js:** v16 o superior
- **PostgreSQL:** v14 o superior
- **Redis:** v6 o superior (para autenticación)
- **Google Cloud:** Cuenta con Cloud Storage configurado

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd Reportabilidad
```

### 2. Instalar Dependencias

```bash
npm run install:all
```

Este comando instalará las dependencias en:
- Raíz del proyecto
- Backend (`/backend`)
- Frontend (`/frontend`)

### 3. Configurar Base de Datos

#### Opción A: Docker (Recomendado)

```bash
npm run db:up
```

Esto levantará PostgreSQL en `localhost:5432`

#### Opción B: PostgreSQL Local

1. Crear base de datos:
```sql
CREATE DATABASE alltura_reports;
```

2. Configurar `.env` en `/backend`:
```env
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=alltura_reports
DB_PASSWORD=tu_contraseña
DB_PORT=5432
```

### 4. Ejecutar Migración de Base de Datos

```bash
node backend/src/db/setup.js
```

Este script creará todas las tablas y sembrará usuarios de prueba:
- **Admin:** `admin@alltura.cl` / `password123`
- **Supervisor:** `supervisor@alltura.cl` / `password123`

### 5. Configurar Google Cloud Storage

1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Crear bucket de Cloud Storage
3. Crear cuenta de servicio con rol "Storage Object Creator"
4. Descargar archivo JSON de credenciales
5. Configurar en `/backend/.env`:

```env
GCS_PROJECT_ID=tu-gcp-project-id
GCS_BUCKET_NAME=tu-gcs-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=./config/service-account-key.json
```

### 6. Configurar Autenticación JWT

En `/backend/.env`:

```env
JWT_SECRET=tu_secreto_super_seguro_minimo_32_caracteres
JWT_REFRESH_SECRET=otro_secreto_diferente_para_refresh
```

### 7. Configurar Redis

En `/backend/.env`:

```env
REDIS_URL=redis://localhost:6379
```

### 8. Archivo .env Completo

```env
# Base de Datos
DB_USER=postgres
DB_HOST=localhost
DB_NAME=alltura_reports
DB_PASSWORD=tu_contraseña
DB_PORT=5432

# JWT
JWT_SECRET=tu_secreto_super_seguro_minimo_32_caracteres
JWT_REFRESH_SECRET=otro_secreto_diferente_para_refresh

# Redis
REDIS_URL=redis://localhost:6379

# Google Cloud Storage
GCS_PROJECT_ID=tu-gcp-project-id
GCS_BUCKET_NAME=tu-gcs-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=./config/service-account-key.json
IMAGE_MAX_BYTES=26214400
IMAGE_STRIP_METADATA=true
IMAGE_JPEG_QUALITY=92

# Node Environment
NODE_ENV=development
PORT=5000

# Frontend URL (para CORS)
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)

```env
# Límite de tamaño de imagen en el frontend (MB)
VITE_IMAGE_MAX_MB=25
```

### 9. Iniciar la Aplicación

```bash
npm run dev
```

Esto iniciará:
- **Backend:** `http://localhost:5000`
- **Frontend:** `http://localhost:5173`

Alternativamente, puedes iniciar cada servidor por separado:

```bash
# Terminal 1 - Backend
npm run start:backend:dev

# Terminal 2 - Frontend
npm run start:frontend
```

---

## 📜 Scripts Disponibles

### Raíz del Proyecto

```bash
# Instalar todas las dependencias
npm run install:all

# Desarrollo simultáneo (backend + frontend)
npm run dev

# Ejecutar todas las pruebas
npm test

# Levantar base de datos con Docker
npm run db:up

# Ver logs de base de datos
npm run db:logs
```

### Backend (`/backend`)

```bash
# Desarrollo con nodemon
npm run dev

# Producción
npm start

# Ejecutar tests
npm test

# Setup de base de datos
node src/db/setup.js

# Crear usuario admin
node src/scripts/create-admin.js

# Limpiar logs antiguos
node src/scripts/clean-logs.js
```

### Frontend (`/frontend`)

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Preview de build
npm run preview

# Ejecutar tests
npm test

# Linting
npm run lint

# Type checking
npm run type-check
```

---

## 📚 Documentación

### Seguridad
- [Security Audit Report](./docs/SECURITY_AUDIT_REPORT.md) - Auditoría completa de seguridad
- [Authentication Hardening](./docs/PHASE_2_AUTHENTICATION_HARDENING.md) - Mejoras de autenticación
- [Input Validation](./docs/PHASE_3_INPUT_VALIDATION.md) - Validación y sanitización

### API
- **Base URL:** `http://localhost:5000/api`
- **Autenticación:** Bearer Token (JWT)

#### Endpoints Principales

**Autenticación:**
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión
- `POST /auth/logout` - Cerrar sesión
- `POST /auth/refresh` - Renovar token
- `POST /auth/change-password` - Cambiar contraseña

**Usuarios:**
- `GET /users` - Listar usuarios (filtrable por rol)
- `GET /users/:id` - Obtener usuario
- `POST /users` - Crear usuario
- `PUT /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Eliminar usuario

**Proyectos:**
- `GET /projects` - Listar proyectos (filtrado por rol)
- `GET /projects/:id` - Obtener proyecto
- `POST /projects` - Crear proyecto
- `PUT /projects/:id` - Actualizar proyecto
- `DELETE /projects/:id` - Eliminar proyecto
- `GET /projects/:id/users` - Usuarios asignados
- `POST /projects/:id/users` - Asignar usuarios

**Andamios:**
- `GET /scaffolds` - Listar andamios (filtrado por rol)
- `GET /scaffolds/project/:projectId` - Andamios por proyecto
- `GET /scaffolds/my-scaffolds` - Andamios propios (supervisor)
- `GET /scaffolds/:id` - Obtener andamio
- `POST /scaffolds` - Crear andamio (FormData con imagen)
- `PUT /scaffolds/:id` - Actualizar andamio
- `PATCH /scaffolds/:id/card-status` - Cambiar estado de tarjeta
- `PATCH /scaffolds/:id/assembly-status` - Cambiar estado de armado
- `GET /scaffolds/:id/history` - Historial de cambios
- `DELETE /scaffolds/:id` - Eliminar andamio

**Dashboard:**
- `GET /dashboard/summary` - Resumen general
- `GET /dashboard/cubic-meters` - Estadísticas de metros cúbicos
- `GET /supervisor-dashboard/summary` - Resumen de supervisor

**Clientes:**
- `GET /clients` - Listar empresas mandantes
- `GET /clients/:id` - Obtener cliente
- `POST /clients` - Crear cliente
- `PUT /clients/:id` - Actualizar cliente
- `DELETE /clients/:id` - Eliminar cliente

**Reportes:**
- `GET /projects/:id/report/pdf` - Generar PDF
- `GET /projects/:id/report/excel` - Generar Excel

---

## 🔧 Reglas de Negocio

### Estados de Andamio

1. **Estado de Tarjeta (card_status)**
   - ✅ Verde: Andamio seguro, cumple normativas
   - ❌ Roja: Requiere atención, no cumple

2. **Estado de Armado (assembly_status)**
   - 🏗️ Armado: Andamio montado y en uso (requiere 100% progreso)
   - 📦 Desarmado: Andamio desmontado (requiere foto)

### Validaciones

- Andamio **armado** DEBE tener `progress_percentage = 100`
- Andamio **desarmado** NO puede tener `card_status = green`
- Cambiar a **desarmado** REQUIERE `disassembly_image`
- Dimensiones: 0-100 metros
- Progreso: 0-100%
- Imágenes: JPG, PNG, WEBP (máx 5MB)

### Permisos

- **Admin:** Puede hacer TODO
- **Supervisor:** Solo crea/edita sus propios andamios
- **Cliente:** Solo visualización de proyectos asignados
- Todos los cambios se registran en historial

---

## 🎨 Estructura del Proyecto

```
/Reportabilidad
├── backend/                # Servidor Node.js + Express
│   ├── src/
│   │   ├── db/            # Base de datos y migraciones
│   │   ├── lib/           # Utilidades y helpers
│   │   ├── middleware/    # Middlewares Express
│   │   ├── models/        # Modelos de datos
│   │   ├── routes/        # Rutas de API
│   │   ├── scripts/       # Scripts de utilidad
│   │   └── index.js       # Punto de entrada
│   ├── uploads/           # Archivos temporales
│   ├── logs/              # Logs del sistema
│   └── package.json
│
├── frontend/              # Aplicación React
│   ├── public/            # Archivos estáticos
│   ├── src/
│   │   ├── assets/        # Imágenes y recursos
│   │   ├── components/    # Componentes React
│   │   ├── context/       # Contextos React
│   │   ├── hooks/         # Custom hooks
│   │   ├── layouts/       # Layouts de páginas
│   │   ├── pages/         # Páginas de la app
│   │   ├── services/      # Servicios API
│   │   ├── types/         # Tipos TypeScript
│   │   └── App.tsx        # Componente principal
│   └── package.json
│
├── docs/                  # Documentación
│   ├── SECURITY_AUDIT_REPORT.md
│   ├── PHASE_2_AUTHENTICATION_HARDENING.md
│   └── PHASE_3_INPUT_VALIDATION.md
│
├── docker-compose.yml     # Configuración Docker
├── package.json           # Configuración monorepo
└── README.md             # Este archivo
```

---

## 🚦 Estado del Proyecto

**Versión Actual:** 2.1.0  
**Estado:** ✅ Producción  
**Última Actualización:** 29 de diciembre de 2025

### Completado

- ✅ Sistema de autenticación con JWT y refresh tokens
- ✅ Control de acceso basado en roles (RBAC)
- ✅ Gestión completa de andamios persistentes
- ✅ Sistema de estados dual (tarjeta + armado)
- ✅ Historial completo con auditoría
- ✅ Dashboard con métricas en tiempo real
- ✅ Generación de reportes PDF/Excel
- ✅ Validación exhaustiva frontend y backend
- ✅ Sistema de seguridad enterprise-grade
- ✅ PWA con capacidades offline
- ✅ Interfaz responsive (móvil + escritorio)
- ✅ Logging estructurado completo

### En Progreso

- ⏳ Fases 4-8 de hardening de seguridad
- ⏳ Notificaciones push
- ⏳ Geolocalización de andamios
- ⏳ Integración con aplicaciones móviles nativas

---

## 👨‍💻 Equipo de Desarrollo

**Empresa:** Alltura  
**Proyecto:** Sistema de Gestión de Andamios  
**Año:** 2024-2025

---

## 📄 Licencia

Copyright © 2024-2025 Alltura. Todos los derechos reservados.

---

## 🆘 Soporte

Para soporte técnico o consultas:
- **Email:** admin@alltura.cl
- **Documentación:** Ver carpeta `/docs`
- **Issues:** Contactar al administrador del sistema

---

**¡Gracias por usar Alltura - Sistema de Gestión de Andamios!** 🏗️


- **Node.js:** v16 o superior.
- **PostgreSQL:** Un servidor de base de datos PostgreSQL en ejecución.

### 2. Instalación de Dependencias

Clona el repositorio y ejecuta el siguiente comando desde la raíz del proyecto para instalar todas las dependencias necesarias (raíz, backend y frontend):

```bash
npm run install:all
```

### 3. Configuración de la Base de Datos

1.  Crea una nueva base de datos en PostgreSQL llamada `alltura_reports`.
2.  Navega al directorio `backend` y renombra el archivo `.env.example` a `.env` (o créalo si no existe).
3.  Edita el archivo `backend/.env` con tus credenciales de PostgreSQL:

    ```
    DB_USER=postgres
    DB_HOST=localhost
    DB_DATABASE=alltura_reports
    DB_PASSWORD=tu_contraseña
    DB_PORT=5432
    ```

4.  Ejecuta el script de configuración para crear las tablas en la base de datos:

    ```bash
    node backend/src/db/setup.js
    ```
   
    Alternativamente, si prefieres usar Docker para levantar PostgreSQL, desde la raíz del proyecto ejecuta:

    ```bash
    docker-compose up -d
    ```
    Esto levantará un contenedor PostgreSQL y mapeará el puerto `5432` del contenedor al `localhost` del host, así tu `DB_HOST=localhost` seguirá funcionando.

### 4. Configuración de Google Cloud Storage (GCS)

Para la subida de imágenes, necesitas configurar una cuenta de Google Cloud:

1.  Crea un proyecto en [Google Cloud Platform](https://console.cloud.google.com/).
2.  Crea un bucket de almacenamiento en Cloud Storage y configúralo para acceso público si es necesario.
3.  Crea una cuenta de servicio con rol de "Storage Object Creator".
4.  Descarga el archivo de clave JSON de la cuenta de servicio.
5.  Añade las siguientes variables al archivo `backend/.env`, apuntando a tu configuración y al archivo de clave:

    ```
    GCS_PROJECT_ID=tu-gcp-project-id
    GCS_BUCKET_NAME=tu-gcs-bucket-name
    GOOGLE_APPLICATION_CREDENTIALS=./ruta/a/tu/service-account-key.json
    ```

6.  (Opcional) Para forzar el uso de GCS y evitar que se guarden imágenes en `/uploads`, añade:

    ```
    IMAGE_STORAGE_PROVIDER=gcs
    ```

7.  (Opcional) Si quieres subir a una carpeta dentro del bucket, usa un prefijo (no pongas `/` en el nombre del bucket):

    ```
    GCS_PREFIX=imagenes
    ```

### 4.1 Autenticación sin llaves (Workload Identity Federation)

Si tu organización bloquea la creación de claves de cuentas de servicio, puedes usar **Workload Identity Federation** y evitar llaves JSON:

1. Crea un **Workload Identity Pool** y un **Provider** (OIDC).
2. Vincula el **Service Account** al proveedor usando `principalSet`.
3. Genera el archivo de credenciales federadas en tu servidor (no es una llave privada):

   ```bash
   gcloud iam workload-identity-pools create-cred-config \
     projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID \
     --service-account=SERVICE_ACCOUNT_EMAIL \
     --output-file=./gcp-wif-credentials.json \
     --credential-source-file=./token.txt
   ```

4. Configura en `backend/.env`:

   ```
   GOOGLE_APPLICATION_CREDENTIALS=./gcp-wif-credentials.json
   ```

> Nota: el `token.txt` debe contener un JWT válido emitido por tu proveedor OIDC (por ejemplo, tu IdP). Google recomienda este enfoque sobre claves JSON en entornos productivos.

### 5. Configuración del Secreto JWT

Añade una cadena de texto secreta y segura en `backend/.env` para la firma de los tokens:

```
JWT_SECRET=tu_secreto_super_seguro
```

## Ejecución de la Aplicación

Una vez completada la configuración, puedes iniciar ambos servidores (backend y frontend) simultáneamente con un solo comando desde la raíz del proyecto:

```bash
npm run dev
```

Esto ejecutará los siguientes procesos:
- **API del Backend:** Disponible en `http://localhost:5000`
- **App del Frontend:** Disponible en `http://localhost:5173` (o el puerto que indique Vite)

Antes de ejecutar `npm run dev`, asegúrate de que PostgreSQL esté arriba. Puedes levantarlo via Docker con:

```bash
npm run db:up
```

or

```bash
docker-compose up -d
```


Alternativamente, puedes iniciar cada servidor por separado:

```bash
# Iniciar solo el backend
npm run start:backend

# Iniciar solo el frontend (en otra terminal)
npm run start:frontend
```

# Proyecto de Reportabilidad

Este monorepo contiene el frontend y el backend de la aplicación de reportabilidad de Alltura.

## Scripts Disponibles

En el directorio raíz, puedes ejecutar:

### `npm test`

Ejecuta todas las pruebas del frontend y del backend.

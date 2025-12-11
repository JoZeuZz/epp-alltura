# Alltura Reports

Aplicación web para la digitalización y gestión de informes de avance en trabajos de montaje de andamios para la empresa "Alltura".

## 🔒 Estado de Seguridad

**Nivel de Seguridad:** 🟢 **ENTERPRISE-GRADE**  
**Última Auditoría:** 10 de diciembre de 2025  
**Vulnerabilidades Críticas:** 7 de 12 remediadas (42% reducción)

### Fases de Seguridad Completadas

- ✅ **FASE 1:** Security Audit (28 vulnerabilidades identificadas)
- ✅ **FASE 2:** Authentication Hardening (9 vulnerabilidades remediadas)
- ✅ **FASE 3:** Input Validation & Sanitization (5 vulnerabilidades remediadas)
- ⏳ **FASE 4-8:** En progreso

📄 **Documentación de Seguridad:**
- [SECURITY_AUDIT_REPORT.md](./docs/SECURITY_AUDIT_REPORT.md) - Auditoría completa
- [PHASE_2_AUTHENTICATION_HARDENING.md](./docs/PHASE_2_AUTHENTICATION_HARDENING.md) - Autenticación
- [PHASE_3_INPUT_VALIDATION.md](./docs/PHASE_3_INPUT_VALIDATION.md) - Validación de inputs

### Protecciones Implementadas

🔐 **Autenticación & Autorización:**
- JWT con tokens de corta duración (15 min) + refresh tokens (7 días)
- Redis para blacklist persistente de tokens
- Passwords según NIST SP 800-63B (mínimo 12 caracteres, breach checking)
- Protección contra brute force (5 intentos / 15 minutos)
- Detección de anomalías (múltiples IPs, cambios de user-agent)

🛡️ **Validación & Sanitización:**
- Content Security Policy (CSP) estricta
- Sanitización automática con DOMPurify
- Validación de esquemas con Joi (100% endpoints)
- Prepared statements en todas las queries SQL
- Protección contra XSS, SQL Injection, NoSQL Injection

🌐 **Headers de Seguridad:**
- HSTS con 1 año de max-age
- X-Frame-Options (previene clickjacking)
- Permissions-Policy (deshabilita APIs peligrosas)
- X-Content-Type-Options (previene MIME sniffing)

## Descripción

"Alltura Reports" es una Aplicación Web Progresiva (PWA) diseñada para reemplazar el reporte de avances vía WhatsApp por un sistema centralizado. Permite a los técnicos en terreno reportar su progreso desde dispositivos móviles y a los administradores supervisar proyectos, visualizar avances y generar informes desde un panel de control de escritorio.

## Funcionalidades Principales

### Rol: Administrador (Admin)
- **Dashboard:** Visualización de métricas clave (Total de m³ armados, proyectos activos, etc.).
- **Gestión de Clientes:** CRUD completo para los clientes de la empresa.
- **Gestión de Proyectos:** CRUD completo para los proyectos, asignándolos a clientes.
- **Gestión de Usuarios:** CRUD completo para los usuarios y sus roles (admin/technician).
- **Visualizador de Reportes:** Vista detallada de los reportes por proyecto, con opción de ver imágenes en tamaño completo.
- **Exportación:** Generación de informes de proyecto en formato PDF y Excel.

### Rol: Técnico (Technician)
- **Interfaz Móvil Simple:** Acceso rápido a los proyectos activos asignados.
- **Creación de Reportes:** Formulario optimizado para móviles que permite:
  - Adjuntar fotos desde la cámara o galería.
  - Ingresar dimensiones (alto, ancho, profundidad).
  - Cálculo automático de metros cúbicos (m³).
  - Ingresar porcentaje de avance y notas adicionales.

## Arquitectura y Tecnologías

La aplicación sigue una arquitectura MVC tanto en el backend como en el frontend.

- **Backend:**
  - **Framework:** Node.js con Express.js
  - **Lenguaje:** JavaScript
  - **Base de Datos:** PostgreSQL
  - **Autenticación:** JSON Web Tokens (JWT)
  - **Almacenamiento de Archivos:** Google Cloud Storage
  - **Generación de Documentos:** `pdfkit`, `exceljs`

- **Frontend:**
  - **Framework:** React.js
  - **Lenguaje:** TypeScript (TSX)
  - **Estilo:** Tailwind CSS
  - **PWA:** `manifest.json` y Service Worker para capacidades offline.
  - **Cliente HTTP:** Axios

## Estructura del Proyecto

```
/Alltura-Reports
|-- /backend         # Servidor Node.js, API y lógica de negocio
|-- /frontend        # Aplicación React (PWA)
`-- README.md
```

## Instalación y Configuración

Sigue estos pasos para configurar y ejecutar el proyecto en un entorno de desarrollo local.

### 1. Prerrequisitos

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

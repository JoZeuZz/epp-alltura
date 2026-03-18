# Proyecto de Reportabilidad - Backend

Este proyecto es la API para la aplicación de reportabilidad de Alltura.

## Tecnologías

- Node.js 12+
- Express
- JWT
- Sequelize
- dotenv
- PostgreSQL

## Mejoras Realizadas

Se han aplicado varias mejoras para aumentar la calidad, mantenibilidad y seguridad del código:

- **Seguridad:**
  - `helmet`: para añadir cabeceras de seguridad HTTP.
  - `cors`: para configurar una política de CORS restrictiva.
  - `express-rate-limit`: para limitar el número de peticiones por IP.
- **Validación de Entradas:** Se ha añadido validación y sanitización de todas las entradas de la API usando `joi`.
- **Gestión de JWT:**
  - Todos los tokens JWT se generan con una fecha de expiración.
  - Se ha implementado una lista de revocación de tokens en memoria para el `logout`.
- **Gestión de Errores y Logging:**
  - Se ha estandarizado el formato de las respuestas de error.
  - Se ha implementado un logger centralizado con Winston que guarda los logs en archivos y en la consola.
- **Scripts y Pruebas:**
  - Se han añadido scripts de `lint` y `test` al `package.json`.
  - Se ha configurado ESLint para asegurar la calidad del código.
  - Se ha configurado Jest para ejecutar pruebas unitarias y de integración.
  - Se han añadido pruebas unitarias para helpers como `excelGenerator` y pruebas de integración para endpoints como el de `login`.

## Scripts Disponibles

En el directorio del proyecto, puedes ejecutar:

### `npm start`

Ejecuta el servidor en modo de producción.

### `npm run dev`

Ejecuta el servidor en modo de desarrollo con `nodemon`, que reinicia el servidor automáticamente al detectar cambios.

### `npm run lint`

Ejecuta ESLint para analizar el código en busca de errores y problemas de estilo.

### `npm run test`

Ejecuta Jest para correr las pruebas unitarias.

---

**Nota sobre la base de datos:**
Si usas Docker para el entorno local, asegúrate de levantar la base de datos antes de iniciar el backend:

```bash
docker-compose up -d
```

Esto levantará un contenedor PostgreSQL y mapeará el puerto `5432` del contenedor al `localhost` del host, por lo que la configuración por defecto (`DB_HOST=localhost`) funcionará. Si prefieres usar una instancia local de PostgreSQL, edita `backend/.env` con tus credenciales y crea la base de datos antes de iniciar el backend.

## Seed de desarrollo automatico

En entorno local, al crear la base por primera vez con Docker Compose de desarrollo, se ejecutan los SQL en `db/init` incluyendo `009-dev-seed.sql`.

Este seed deja un dataset completo para pruebas manuales de inventario y flujos operacionales:

- Ubicaciones base (`Bodega Central`, `Faena Norte`, `Taller Mantencion`).
- Proveedor y articulos de ejemplo:
  - `Taladro Industrial` (serial, retornable).
  - `Arnes de Seguridad` (serial, retornable).
  - `Guante de cabritilla` (consumible).
- Activos seriales:
  - Taladros `TAL-001` .. `TAL-005`.
  - Arneses `ARN-001` .. `ARN-003`.
- Ingreso, egreso consumible con remanente, entrega mixta y devolucion de ejemplo.

### Usuarios demo

- Password comun: `Dev12345!`
- `admin.dev@alltura.local` (admin)
- `bodega.dev@alltura.local` (bodega)
- `supervisor.dev@alltura.local` (supervisor)
- `juan.herrera@alltura.local` (trabajador)
- `maria.rojas@alltura.local` (trabajador)

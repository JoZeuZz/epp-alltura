# Datos Iniciales de la Base de Datos

Este documento describe los datos que se crean automáticamente al inicializar la base de datos por primera vez.

## 🔐 Usuarios del Sistema

Se crean dos usuarios por defecto para acceder a la aplicación:

| Rol | Email | Contraseña | Nombre |
|-----|-------|-----------|--------|
| Administrador | `admin@alltura.cl` | `password123` | Administrador Alltura |
| Técnico | `tech@alltura.cl` | `password123` | Técnico de Campo |

⚠️ **IMPORTANTE**: Cambiar estas contraseñas en producción.

## 🏢 Empresa Mandante

Se crea una empresa mandante principal:

- **CMPC S.A.**
  - Contacto: Gerencia de Operaciones
  - Email: contacto@cmpc.cl
  - Teléfono: +56 41 2345678
  - Dirección: Planta Laja, Región del Biobío, Chile

## 🔧 Empresas Clientes (Subcontratistas)

Se crean 5 empresas clientes que trabajan en la región del Biobío:

1. **CMPC S.A.** - Cliente directo para algunos proyectos
2. **Massebal SpA** - Montaje Industrial y Mantención (Concepción)
3. **Bunker Ingeniería y Construcción** - Construcción Industrial y Montajes (Los Ángeles)
4. **Simming S.A.** - Servicios de Montaje y Mantención Industrial (Coronel)
5. **CMG Construcción y Montaje** - Montaje de Estructuras y Andamios (Talcahuano)

## 👷 Supervisores

Se crean 4 supervisores de ejemplo:

1. **Carlos Muñoz Silva** - RUT: 12.345.678-9
2. **María González Torres** - RUT: 13.456.789-0
3. **Roberto Pérez Valdés** - RUT: 14.567.890-1
4. **Patricia Soto Ramírez** - RUT: 15.678.901-2

## 👥 Usuarios Finales (Departamentos de CMPC)

Se crean 5 departamentos de CMPC como usuarios finales:

1. **Departamento de Mantención - Planta Laja** (Mantención Industrial)
2. **Área de Producción - Planta Laja** (Producción)
3. **Gerencia de Proyectos CMPC** (Proyectos)
4. **Departamento de Calidad** (Control de Calidad)
5. **Equipo de Seguridad Industrial** (Seguridad y Prevención)

## 📝 Notas

- Todos estos datos se crean automáticamente al:
  1. Inicializar la base de datos con Docker (`init.sql`)
  2. Ejecutar el backend por primera vez (`initialize.js`)

- Los scripts verifican si los datos ya existen antes de insertarlos, usando `ON CONFLICT DO NOTHING` para evitar duplicados.

- Para recrear la base de datos desde cero:
  ```bash
  docker compose down -v
  docker compose up -d
  cd backend && npm start
  ```

## 🌍 Contexto Regional

Todas las empresas listadas operan en la **Región del Biobío, Chile**, que es un importante polo industrial forestal y manufacturero del país. CMPC es una de las principales empresas de celulosa y papel de Latinoamérica.

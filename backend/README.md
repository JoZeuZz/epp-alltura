# Backend — Alltura Control Operativo

API REST para gestión de inventario, custodia de activos, entregas, devoluciones y firma digital.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Jest](https://img.shields.io/badge/Tests-Jest-C21325?logo=jest&logoColor=white)

---

## Arquitectura

```
Request → middleware pipeline → route → controller → service → model/db → PostgreSQL
                                                                        ↘ Redis
                                                                        ↘ GCS
```

**Capas:**

| Capa | Responsabilidad |
|---|---|
| `routes/` | Definición de endpoints, validación Joi, autenticación |
| `controllers/` | Parseo de request/response HTTP, delegación al service |
| `services/` | Lógica de negocio, transacciones, orquestación |
| `models/` | Queries SQL parametrizadas por entidad |
| `db/` | Pool de conexiones PostgreSQL, inicialización |
| `middleware/` | Auth, RBAC, rate limit, sanitización, requestId, errorHandler |
| `lib/` | Utilidades transversales: PDF, GCS, logging, SSE, push notifications |

---

## Rutas API

Base: `/api`

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Login con email + password |
| `POST` | `/auth/refresh` | Renovar access token |
| `POST` | `/auth/logout` | Invalidar refresh token |
| `GET` | `/auth/me` | Perfil del usuario autenticado |

### Artículos
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/articulos` | Listar artículos |
| `GET` | `/articulos/:id` | Detalle de artículo |
| `POST` | `/articulos` | Crear artículo |
| `PUT` | `/articulos/:id` | Actualizar artículo |
| `DELETE` | `/articulos/:id` | Soft delete |
| `DELETE` | `/articulos/:id/permanent` | Eliminación permanente + destrucción GCS |

> Campos vigentes en payload: `grupo_principal`, `subclasificacion`, `especialidades`.  
> Rechazados por validación: `tipo`, `categoria`, `tracking_mode`, `retorno_mode`.

### Inventario / Activos
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/inventario/activos` | Listado de activos |
| `GET` | `/inventario/activos-paged` | Activos paginados |
| `GET` | `/inventario/activos-disponibles` | Activos sin custodia activa |
| `GET` | `/inventario/activos/:id/perfil` | Perfil completo del activo |
| `PATCH` | `/inventario/activos/:id/estado` | Cambiar estado del activo |
| `PATCH` | `/inventario/activos/:id/reubicar` | Reubicar activo |
| `PATCH` | `/inventario/activos/:id` | Actualizar activo |
| `GET` | `/inventario/movimientos-activo` | Historial de movimientos |
| `GET` | `/inventario/auditoria` | Registro de auditoría |
| `GET` | `/inventario/stock-summary` | Resumen de stock |
| `POST` | `/inventario/ingresos` | Registrar ingreso |
| `DELETE` | `/inventario/ingresos/:id` | Eliminar ingreso |

### Entregas
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/entregas` | Listar entregas |
| `GET` | `/entregas/:id` | Detalle de entrega |
| `POST` | `/entregas` | Crear borrador |
| `POST` | `/entregas/:id/confirm` | Confirmar entrega (exige firma previa) |
| `POST` | `/entregas/:id/anular` | Anular entrega |
| `POST` | `/activos/:id/entregar` | Crear entrega desde perfil de activo |

### Devoluciones
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/devoluciones` | Listar devoluciones |
| `GET` | `/devoluciones/:id` | Detalle de devolución |
| `GET` | `/devoluciones/activos-elegibles` | Activos con custodia activa del trabajador |
| `POST` | `/devoluciones` | Crear borrador |
| `POST` | `/devoluciones/:id/firmar-dispositivo` | Firmar desde dispositivo |
| `POST` | `/devoluciones/:id/confirm` | Confirmar devolución |
| `POST` | `/devoluciones/:id/anular` | Anular devolución |
| `POST` | `/activos/:id/devolver` | Crear devolución desde perfil de activo |

### Firmas digitales
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/firmas/entregas/:id/token` | Generar token QR para entrega |
| `POST` | `/firmas/entregas/:id/firmar-dispositivo` | Firmar entrega desde dispositivo |
| `GET` | `/firmas/tokens/:token` | Resolver token público |
| `POST` | `/firmas/tokens/:token/firmar` | Firmar via token QR |
| `POST` | `/firmas/devoluciones/:id/token` | Generar token QR para devolución |
| `GET` | `/firmas/devoluciones/:token` | Resolver token de devolución |
| `POST` | `/firmas/devoluciones/:token/firmar` | Firmar devolución via token QR |

**SSE (Server-Sent Events):**

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/firmas/events/deliveries/token` | Obtener stream token |
| `GET` | `/firmas/events/deliveries?stream_token=…` | Suscribir a eventos de firma |

Eventos emitidos: `delivery-signed`, `return-signed`

### Otros módulos
| Prefijo | Descripción |
|---|---|
| `/users` | CRUD de usuarios del sistema |
| `/trabajadores` | Gestión de trabajadores (entidad dominio) |
| `/bodegas` | CRUD de bodegas |
| `/proyectos` | CRUD de proyectos |
| `/proveedores` | CRUD de proveedores |
| `/dashboard` | Métricas operativas |
| `/notifications` | Web push (suscripción, envío) |
| `/image-proxy` | Proxy de imágenes GCS con signed URLs |

### Health checks
| Ruta | Descripción |
|---|---|
| `/health` | Status general |
| `/health/live` | Liveness probe |
| `/health/ready` | Readiness probe (verifica DB + Redis) |

---

## Middleware pipeline

```
requestId → helmet → cors → compression → rateLimit
  → bodyParser → sanitization (mongo-sanitize, hpp, xss-clean, dompurify)
  → auth (JWT verify) → roles (RBAC)
  → [route handler]
  → errorHandler
```

---

## Reglas de negocio clave

- `trabajador` es entidad de dominio, no usuario autenticable.
- Entregas y devoluciones operan **solo** sobre activos serializados.
- Confirmar entrega requiere firma previa → abre `custodia_activo` activa.
- Confirmar devolución cierra custodia y aplica disposición:

| Disposición | Efecto en activo |
|---|---|
| `devuelto` | Estado disponible, regresa a bodega origen |
| `perdido` | Estado perdido |
| `baja` | Estado de baja |
| `mantencion` | Estado en mantención |

- `tracking_mode` se resuelve en backend según `grupo_principal` (EPP → lote, resto → serial).
- Campos legacy `tipo`, `categoria` son rechazados por validación Joi.

---

## Tests

```bash
# Todos los tests
npm test

# Tests de servicios
npm run test:services

# Tests de integración con DB real (requiere docker-compose.dev.yml)
npm run test:integration-db
```

**Cobertura:**

| Tipo | Ubicación |
|---|---|
| Unitarios (services, lib) | `src/tests/services/`, `src/tests/lib/` |
| Integración (routes + DB) | `src/tests/integration/` |
| Contratos API | `src/tests/contracts/` |

---

## Scripts

```bash
npm run dev          # Nodemon con hot reload
npm start            # Producción (node directo)
npm run lint         # ESLint
npm test             # Jest
npm run test:integration-db   # Tests con DB real
```

---

## Observabilidad

| Mecanismo | Descripción |
|---|---|
| `requestId` | UUID por request, propagado en logs y respuestas |
| Winston | Logs estructurados (JSON en producción, pretty en dev) |
| Audit trail | Eventos de negocio registrados en tabla `auditoria_db` |
| Health probes | `/health/ready` verifica conectividad DB + Redis |

---

## Deuda técnica conocida

- Swagger desactualizado — endpoints de inventario/activos no documentados.
- Tablas DB sin CRUD activo: `inspeccion_activo`, `lote`.
- Columnas candidatas a DROP: `articulo.categoria` (nullable legacy), `persona.foto_url`.

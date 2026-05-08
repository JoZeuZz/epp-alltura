# Diseño: Estabilidad operativa + UX del flujo de entrega con firma y QR

Fecha: 2026-05-08
Estado: Aprobado en brainstorming (pendiente revisión final del usuario)
Alcance: flujo de entrega desde perfil de activo, firma en dispositivo y firma remota por QR, reanudación de pendientes, sin migraciones.

## 1. Contexto y problema

El flujo operativo actual de entregas en entorno de desarrollo permite crear y firmar, pero presenta riesgo de fricción y regresiones en dos ejes prioritarios:

- Estabilidad operativa: evitar errores 400 por desalineación de contratos y evitar pérdida de estado cuando se interrumpe la firma.
- UX del flujo: reducir pasos mentales y clics para completar entrega firmada, sin mensajes guiados extensos.

Condiciones definidas:

- Entornos prioridad: ambos (Docker-Dev/local y entorno remoto de desarrollo).
- Se puede modificar libremente sin costo de migración ahora.
- La entrega debe completarse con firma obligatoria.
- La evidencia fotográfica de entrega se implementará después, pero debe quedar preparado el punto de extensión.

## 2. Objetivos

## 2.1 Objetivos funcionales

- Mantener modelo tolerante a fallos: crear entrega primero y continuar a firma.
- Abrir firma inmediatamente luego de crear entrega (sin exponer concepto de "borrador" en UI principal).
- Permitir dos vías de firma equivalentes:
  - firma local en dispositivo del operador,
  - firma remota por QR/token en celular.
- Confirmar entrega al completar firma (inmediata para firma local, automática por SSE para QR).

## 2.2 Objetivos de estabilidad

- Eliminar regresiones de contrato (400 evitables) entre frontend y backend.
- Permitir reanudación de entregas pendientes de firma/confirmación.
- Evitar estados perdidos al cerrar modal, perder SSE o fallar confirmación posterior a firma.

## 2.3 Objetivos de UX

- Flujo mixto rápido (2 pasos con presets inteligentes), sin mensajes guiados de onboarding.
- Feedback corto, accionable y consistente por etapa.
- Experiencia intuitiva de reanudación desde el perfil del activo.

## 3. No objetivos

- No rediseñar el dominio de entregas/devoluciones ni migrar esquemas DB.
- No introducir una nueva pantalla compleja de operaciones si no aporta en esta fase.
- No implementar aún carga de foto de prueba (solo dejar extensión definida).

## 4. Estado actual relevante (resumen técnico)

- Entrega se crea en backend con estado "borrador" y detalles serializados.
- Confirmación exige firma previa.
- Firma soporta:
  - dispositivo autenticado,
  - token QR público,
  - eventos SSE de firma para sincronización.
- Frontend opera desde modal de perfil de activo, no desde una página dedicada de entregas.

## 5. Enfoque elegido

Se adopta enfoque híbrido:

- Persistir entrega primero (resiliencia).
- Saltar inmediatamente a modal de firma (UX rápida).
- Completar en un solo impulso cuando hay firma local.
- Mantener recuperación/reanudación cuando hay firma remota por QR o fallos intermedios.

Razonamiento:

- Firma-primero sin persistencia aumenta riesgo de pérdida de operación ante errores de red/dispositivo.
- Persistencia + salto directo a firma conserva intuición para usuario y robustez técnica.

## 6. Diseño funcional detallado

## 6.1 Estados operativos derivados (sin cambios de esquema)

Se definen estados de UI derivados de datos existentes:

- borrador_sin_firma: entrega.estado=borrador y sin firma registrada.
- firmada_pendiente_confirmacion: entrega.estado=borrador y con firma registrada.
- confirmada: entrega.estado=confirmada.
- anulada: entrega.estado=anulada.

Estos estados son de presentación/orquestación, no nuevos enums persistentes.

## 6.2 Orquestación del flujo de entrega

1. Usuario completa datos mínimos en modal de entrega (flujo 2 pasos optimizado).
2. Frontend crea entrega en endpoint de activos/entrega con payload validado.
3. Al éxito, se abre inmediatamente modal de firma.
4. Firma local:
   - registrar firma,
   - confirmar entrega,
   - actualizar perfil/estado y cerrar flujo.
5. Firma QR:
   - generar token + QR,
   - escuchar SSE de firma,
   - al evento delivery-signed: confirmar entrega automáticamente.
6. Si confirmación falla tras firma:
   - conservar estado firmada_pendiente_confirmacion,
   - mostrar acción de reintento.

## 6.3 Recuperación y reanudación

Desde perfil del activo debe existir bloque de estado de entrega en progreso cuando aplique:

- Mostrar última entrega no confirmada asociada al activo.
- Acciones mínimas:
  - Reanudar firma.
  - Reintentar confirmación (si ya firmada).
  - Cerrar/volver (sin perder persistencia).

Regla de flexibilidad:

- No bloquear toda la aplicación por pendientes.
- Bloquear solo acciones conflictivas sobre el mismo activo mientras tenga entrega en curso.

## 6.4 UX (sin mensajes guiados)

Principios:

- No onboarding textual largo, no tours para este flujo.
- Micro-feedback breve por etapa:
  - Entrega creada.
  - Firma registrada.
  - Entrega confirmada.
- Mensajes de error directos y con siguiente acción inmediata.

## 6.5 Preparación para evidencia fotográfica (fase posterior)

Se define punto de extensión en flujo:

- afterSignatureBeforeConfirm

Comportamiento planificado (aún no implementado):

- Permitir adjuntar foto de prueba después de firma válida y antes de confirmación final.
- Inicialmente configurable como opcional.
- Diseño de contrato interno preparado para no rediseñar flujo al activarlo.

## 7. Arquitectura y componentes impactados

## 7.1 Frontend

Componentes y hooks foco:

- frontend/src/components/forms/ActivoProfileModal.tsx
- frontend/src/components/forms/EntregaCreateModal.tsx
- frontend/src/components/forms/EntregaFirmaModal.tsx
- frontend/src/hooks/useDeliverySignatureEvents.ts
- frontend/src/shell/services/apiService.ts

Cambios esperados de diseño:

- Centralizar mapper de payload de entrega para evitar drift.
- Consolidar transición crear->firmar->confirmar con estados derivados.
- Añadir superficie mínima de reanudación en perfil del activo.

## 7.2 Backend

Servicios/rutas foco:

- backend/src/services/activos.service.js
- backend/src/services/entregas.service.js
- backend/src/routes/activos.routes.js
- backend/src/routes/firmas.routes.js

Cambios esperados de diseño:

- Mantener arquitectura actual (controllers->services->models).
- Fortalecer validaciones y errores de contrato sin cambiar esquema DB.
- Mantener compatibilidad con firma por QR y firma local.

## 8. Manejo de errores y resiliencia

Categorías operativas:

- Error al crear entrega.
- Error al firmar (local o token).
- Error al confirmar entrega.
- Error de sincronización SSE.

Estrategia:

- Mensaje corto por categoría.
- Botones de recuperación contextual (reintentar/reanudar).
- Evitar pérdida de operación ya persistida.

## 9. Pruebas mínimas requeridas

## 9.1 Backend

- Caso feliz: crear->firmar->confirmar (2xx).
- Joi: rechazo 4xx por payload inválido.
- Regla de firma requerida antes de confirmar (409).
- Reintento de confirmación sin efectos duplicados.

## 9.2 Frontend

- Crear entrega desde perfil de activo con 1 ítem y 2+ ítems.
- Firma local completa el flujo y confirma.
- Firma QR completa mediante SSE y confirma.
- Cerrar/reabrir modal permite reanudación.
- Confirmar ausencia de mensajes guiados extensos.

## 10. Rollout propuesto

Fase A (inmediata):

- Hardening de flujo actual.
- Reanudación en perfil de activo.
- Estabilización contratos payload/error.

Fase B (siguiente):

- Vista compacta de pendientes (firma/confirmación) en panel operativo.
- Métricas de embudo operativo (creadas/firmadas/confirmadas/atascadas).

Fase C (posterior):

- Implementar evidencia fotográfica post-firma con punto de extensión ya definido.

## 11. Riesgos y mitigaciones

Riesgo: entrega firmada no confirmada por fallo transitorio.
Mitigación: estado derivado firmada_pendiente_confirmacion + reintento explícito.

Riesgo: regresión de contrato entre modales y endpoint.
Mitigación: mapper único de payload + pruebas de contrato frontend/backend.

Riesgo: confusión por estado invisible de pendientes.
Mitigación: bloque de reanudación visible en perfil de activo y listado compacto opcional.

## 12. Criterios de aceptación

- Desde perfil de activo, el operador completa entrega firmada en un flujo continuo.
- Firma local confirma de inmediato.
- Firma por QR confirma automáticamente al recibir evento o permite reintento seguro.
- Si el flujo se interrumpe, la operación puede reanudarse sin pérdida.
- No hay errores 400 por payload inválido en el escenario nominal.
- No se introducen migraciones ni dependencias nuevas para esta fase.

## 13. Decisiones abiertas para siguiente plan

- Umbral temporal de "última entrega en progreso" en UI (ej: últimas 24h vs sin límite).
- Si el botón de reintento confirmación será visible siempre o solo ante errores.
- Si la vista compacta de pendientes va en dashboard admin, supervisor o ambos.

# Implementacion 2026-04-09 - Paridad Shell Base EPP

## Objetivo
Completar paridad del shell base con estandar Alltura sin alterar logica de negocio EPP (inventario, entregas, devoluciones).

## Cambios aplicados

### 1) Arbol de providers en App root
Archivo: frontend/src/App.tsx

Arbol final:
- AuthProvider
  - NotificationProvider
    - TourProvider
      - Toaster
      - AppContent
      - RouterProvider

Resultado:
- NotificationProvider queda activo en raiz de aplicacion, consistente con AuthProvider y TourProvider.
- No se altero el flujo de Router ni efectos de AppContent.

### 2) Contrato canonico dashboard base
Archivos:
- frontend/src/components/dashboard/ProjectDashboard.tsx (nuevo)
- frontend/src/components/dashboard/index.ts

Set canonico exportado:
- MetricCard
- StatsCard
- ProjectDashboard

Contrato de ProjectDashboard:
- Props:
  - summary: ProjectDashboardSummary
  - projectName?: string
  - className?: string
- Naturaleza:
  - Componente presentacional de shell.
  - Sin fetch, sin loaders, sin mutaciones de dominio.
- Reuso de shell:
  - MetricCard
  - StatsCard
  - CustomGrid

Campos principales de ProjectDashboardSummary:
- Cubic meters: total, assembled, disassembled, inProgress, contracted (opc), completion (opc), assembly/disassembly progress (opc)
- Scaffolds: total, assembled, disassembled, inProgress, green/red cards, active cards total (opc)
- Extras: recentScaffoldsCount, avgProgress

### 3) Decision sourcemaps build
Archivo: frontend/vite.config.ts

Decision:
- build.sourcemap = false (explicito)

Impacto:
- Build de produccion no emite .map.
- Desarrollo no se ve afectado por esta propiedad de build.

## Compatibilidad con pantallas actuales

Estado:
- No se modificaron rutas, loaders ni handlers de paginas EPP.
- No se cambiaron llamadas de negocio en inventario/entregas/devoluciones.
- ProjectDashboard se incorpora como capacidad shell disponible, sin forzar adopcion inmediata en pantallas.
- Se mantiene same-origin /api en cliente.

## Validacion ejecutada

1. Lint frontend
- Comando: npm run lint --prefix frontend
- Resultado: OK

2. Pruebas frontend relevantes (notificaciones/shell)
- Comando: npm run test --prefix frontend -- src/tests/use-notifications.polling.test.tsx src/tests/notification-item.test.tsx
- Resultado: OK (8 tests)

3. Build frontend produccion
- Comando: npm run build --prefix frontend
- Resultado: OK

4. Verificacion sourcemaps
- Comando: find frontend/dist -type f -name '*.map'
- Resultado: sin salida (no .map)

## Notas de alcance
- Sin dependencias nuevas.
- Sin mover shell a otra carpeta en esta fase.
- Sin cambios en logica de negocio EPP.

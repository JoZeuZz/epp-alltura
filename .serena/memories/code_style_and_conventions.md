# Estilo de Código y Convenciones

## Backend (JavaScript/Node.js)
- **Módulos**: CommonJS (require/module.exports)
- **Sintaxis**: async/await para asincronía
- **Nombres**: camelCase para variables/funciones, PascalCase para clases
- **Errores**: Try/catch, logging centralizado con Winston
- **Validación**: Joi para inputs API
- **Seguridad**: Helmet, CORS restrictivo, rate limiting
- **Archivos**: Un archivo por ruta/modelo/lib
- **Comentarios**: JSDoc para funciones públicas

## Frontend (TypeScript/React)
- **Módulos**: ES6 imports/exports
- **Componentes**: Funcionales con hooks
- **Sintaxis**: JSX, TypeScript estricto (NO usar `any`)
- **Nombres**: PascalCase para componentes, camelCase para variables
- **Estado**: React Query para servidor, Context para auth
- **Estilos**: Tailwind CSS utility-first
- **Rutas**: React Router v7 con rutas protegidas por rol
- **Tipos**: Interfaces en types/, enums donde aplique
- **Formularios**: React Hook Form + Zod para validación
- **Lazy Loading**: Usar lazy() para todas las páginas (code splitting)
- **Optimización**: React.memo para componentes pequeños reutilizables
- **Hooks**: useMemo para cálculos costosos, useCallback para callbacks estables

## General
- **Linting**: ESLint con reglas recomendadas
- **Formateo**: Prettier (single quotes, trailing commas, 100 width)
- **Testing**: Jest para unitarias e integración
- **Commits**: Mensajes descriptivos en español/inglés
- **Branches**: main para producción, feature branches
- **Variables**: UPPER_CASE para env, camelCase para código

## Patrones de Diseño
- MVC en backend
- Componentes reutilizables en frontend
- Servicios separados (apiService, etc.)
- Middlewares para auth/roles
- Hooks custom para lógica compartida
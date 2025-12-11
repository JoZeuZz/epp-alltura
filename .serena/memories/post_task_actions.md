# Acciones Después de Completar una Tarea

Después de cualquier cambio significativo en el código:

1. **Ejecutar Tests**: `npm test` para asegurar funcionalidad
2. **Linting**: `npm run lint` en backend/frontend para calidad
3. **Formateo**: `npm run format` en frontend para consistencia
4. **Verificar Build**: `npm run build` en frontend si cambió UI
5. **Commit**: Mensaje claro, ej: "feat: añadir validación login"
6. **Push**: Después de tests pasan

Para cambios en backend:
- Verificar endpoints con Postman/insomnia
- Revisar logs en consola/archivos

Para cambios en frontend:
- Probar en móvil (responsive)
- Verificar PWA offline

Antes de merge a main:
- Code review si equipo
- Tests pasan en CI/CD
- No hay errores de lint
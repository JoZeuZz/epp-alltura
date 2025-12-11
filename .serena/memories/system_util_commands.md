# Comandos Utilitarios del Sistema (Windows/bash)

## Navegación y Archivos
- `pwd`: Directorio actual
- `ls -la`: Listar archivos detallado
- `cd ruta`: Cambiar directorio
- `mkdir nombre`: Crear directorio
- `touch archivo`: Crear archivo vacío
- `cp origen destino`: Copiar archivo
- `mv origen destino`: Mover/renombrar
- `rm archivo`: Eliminar archivo
- `rm -rf directorio`: Eliminar directorio recursivo
- `cat archivo`: Ver contenido completo
- `head -n 20 archivo`: Primeras 20 líneas
- `tail -n 20 archivo`: Últimas 20 líneas
- `grep "patron" archivo`: Buscar texto
- `find . -name "*.js"`: Buscar archivos por nombre

## Git
- `git init`: Inicializar repo
- `git clone url`: Clonar repo
- `git status`: Estado cambios
- `git add .`: Agregar todos cambios
- `git add archivo`: Agregar archivo específico
- `git commit -m "mensaje"`: Commit cambios
- `git push origin rama`: Push a rama
- `git pull origin rama`: Pull cambios
- `git branch`: Ver ramas
- `git checkout rama`: Cambiar rama
- `git log --oneline`: Historial commits
- `git diff`: Ver diferencias
- `git reset --hard HEAD~1`: Deshacer último commit

## Procesos
- `ps aux`: Ver procesos
- `kill PID`: Matar proceso
- `top` o `htop`: Monitor procesos
- `bg`: Poner proceso en background
- `fg`: Traer proceso a foreground

## Red
- `curl url`: Hacer request HTTP
- `ping host`: Probar conectividad
- `netstat -tlnp`: Puertos abiertos
- `ifconfig` o `ip addr`: Config IP

## Docker
- `docker ps`: Contenedores corriendo
- `docker images`: Imágenes disponibles
- `docker build -t nombre .`: Build imagen
- `docker run nombre`: Ejecutar contenedor
- `docker-compose up`: Iniciar servicios
- `docker-compose down`: Detener servicios
- `docker logs nombre`: Ver logs contenedor

## Node.js
- `node --version`: Versión Node
- `npm --version`: Versión npm
- `npm install`: Instalar dependencias
- `npm update`: Actualizar paquetes
- `npm list`: Ver dependencias instaladas
- `npx comando`: Ejecutar paquete sin instalar
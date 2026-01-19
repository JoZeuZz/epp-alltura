# Stage: builder
FROM node:18-alpine AS builder
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
ENV NPM_CONFIG_PRODUCTION=false
WORKDIR /app

# Copiar package files para caché
COPY package*.json ./
COPY yarn.lock* pnpm-lock.yaml* ./

# Instala según lockfile disponible
RUN if [ -f pnpm-lock.yaml ]; then \
      npm install -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
      npm install -g yarn && yarn install --frozen-lockfile --production=false; \
    else \
      npm ci; \
    fi

COPY . .
# Ejecuta build y muestra archivos para debugging
RUN npm run build && \
    if [ -d /app/dist ]; then ls -la /app/dist; \
    elif [ -d /app/build ]; then ls -la /app/build; \
    else echo "ERROR: build output not found (expected /app/dist or /app/build)"; exit 1; fi

# Normalizar salida a /app/output
RUN rm -rf /app/output && mkdir -p /app/output && \
    if [ -d /app/dist ]; then cp -a /app/dist/. /app/output; \
    elif [ -d /app/build ]; then cp -a /app/build/. /app/output; fi

# Stage: runtime (nginx)
FROM nginx:alpine
RUN apk add --no-cache bash gettext curl
COPY --from=builder /app/output /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
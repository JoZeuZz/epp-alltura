# Stage: builder
FROM node:18-alpine AS builder
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
WORKDIR /app
# Copiar package.json y lockfile primero para cache
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage: runtime (nginx)
FROM nginx:alpine
RUN apk add --no-cache bash gettext curl
# Copiar build (asegura que el builder produce /app/dist)
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
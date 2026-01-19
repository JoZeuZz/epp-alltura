FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM nginx:alpine
# Install envsubst for runtime config templating and curl for healthchecks
RUN apk add --no-cache bash gettext curl
# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy nginx template and entrypoint that substitutes BACKEND_URL at container start
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -fsS http://localhost/ || exit 1
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
# Stage: builder
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Set production environment and build
ENV NODE_ENV=production
RUN echo "Starting build..." && \
  npm run build && \
  echo "Build complete. Checking output..." && \
  ls -la /app/dist || ls -la /app/build || (echo "ERROR: No build output found" && exit 1)

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
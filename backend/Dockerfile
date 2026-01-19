# Builder stage: install dependencies
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# Use modern npm flag to omit dev dependencies and keep layer caching small
RUN npm ci --silent --omit=dev
COPY . .

# Runtime stage: smaller image using only production files
FROM node:18-alpine AS runtime
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app .
# Install curl for healthchecks
RUN apk add --no-cache curl
# Create non-root user for safer runtime
RUN addgroup -S app && adduser -S app -G app
# Ensure runtime writable dirs exist and are owned by app
RUN mkdir -p uploads logs && chown -R app:app /usr/src/app/uploads /usr/src/app/logs
USER app
ENV NODE_ENV=production
EXPOSE 5000
# Healthcheck against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -fsS http://localhost:5000/health || exit 1
CMD ["node", "src/index.js"]
# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 2: production image ────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Security: run as a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package.json ./

# Ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Health check — hits the /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/v1/health || exit 1

EXPOSE ${PORT:-3000}

ENV NODE_ENV=production

CMD ["node", "src/server.js"]

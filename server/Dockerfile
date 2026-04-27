# Production API image
FROM node:20-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=nodejs:nodejs . .

RUN mkdir -p /app/uploads/pdfs /app/uploads/documents /app/uploads/badges \
  && chown -R nodejs:nodejs /app/uploads

USER nodejs

ENV NODE_ENV=production
EXPOSE 3001

# Healthcheck calls /health (which pings Mongo) using the bundled Node
# runtime so we don't need to install curl/wget into the slim image.
# Treats only HTTP 200 as healthy; the route itself returns 503 if the
# DB connection is down, so this gate trips the moment Mongo drops.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]

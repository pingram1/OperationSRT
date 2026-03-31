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

CMD ["node", "server.js"]

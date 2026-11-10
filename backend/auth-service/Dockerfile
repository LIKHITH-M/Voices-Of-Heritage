# ── Stage 1: Build ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Runtime ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER nodeuser
EXPOSE 4001
ENV NODE_ENV=production
CMD ["node", "src/index.js"]

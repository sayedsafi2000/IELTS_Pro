# ── server/Dockerfile ──────────────────────────────────────────────
FROM node:20-alpine AS base

# OpenSSL is required by Prisma on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Install deps (incl. dev so prisma CLI is available for generate/migrate)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client (schema lives at src/prisma/schema.prisma)
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Local upload dir (mounted to a volume in compose)
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
EXPOSE 5000

# On boot: apply pending migrations, then start the API
CMD ["sh", "-c", "npx prisma migrate deploy --schema=src/prisma/schema.prisma && node src/server.js"]

FROM node:lts-alpine AS base
RUN node --version && npm --version

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY .npmrc package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV AWS_S3_BUCKET_NAME=foodinger
RUN corepack enable pnpm && pnpm run build

# Stage 3: Production server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV PORT=3000 \
    HOSTNAME=0.0.0.0
EXPOSE $PORT
CMD ["node", "server.js"]

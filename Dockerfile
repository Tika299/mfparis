# To use this Dockerfile, set `output: 'standalone'` in next.config.mjs

FROM node:22.17.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm install --include=dev; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --prod=false; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Build
FROM base AS builder
WORKDIR /app

ARG DATABASE_URL
ARG PAYLOAD_SECRET
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SERVER_URL
ARG MEDIA_DIR

ENV DATABASE_URL=$DATABASE_URL
ENV PAYLOAD_SECRET=$PAYLOAD_SECRET
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV MEDIA_DIR=$MEDIA_DIR

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run migrate:prod && yarn run build; \
  elif [ -f package-lock.json ]; then npm run migrate:prod && npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run migrate:prod && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Runtime
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Quan trọng: Payload media sẽ lưu ở đây
ENV MEDIA_DIR=/app/media

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Public assets
COPY --from=builder /app/public ./public

# Tạo thư mục cache và media
RUN mkdir -p .next
RUN mkdir -p /app/media

# Cấp quyền ghi cho user nextjs
RUN chown -R nextjs:nodejs .next
RUN chown -R nextjs:nodejs /app/media

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
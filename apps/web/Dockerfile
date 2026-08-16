# ============================================================================
# AsistControl — Dockerfile de Producción para Panel Web & PWA (Next.js 15)
# Multi-stage build optimizado para monorepo pnpm + Turborepo
# ============================================================================

# ── Stage 1: Base & Dependencies ──────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# ── Stage 2: Pruner & Installer ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copiar archivos de dependencias del monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY apps/web ./apps/web
COPY packages/db ./packages/db
COPY packages/ui ./packages/ui

# Generar cliente Prisma
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm --filter @asistencias/db exec prisma generate

# Desactivar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compilar proyecto en modo standalone
ENV STANDALONE=1
RUN pnpm --filter @asistencias/web build

# ── Stage 3: Production Runner ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instalar OpenSSL para Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Crear usuario sin privilegios por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos estáticos y bundle standalone
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]

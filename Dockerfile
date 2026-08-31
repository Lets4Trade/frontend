# syntax=docker/dockerfile:1.4
# Build acontece na VPS — sem GHCR, sem push/pull de imagem.
# BuildKit persiste pnpm store e .next/cache entre deploys consecutivos.

FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

# -----------------------------
# Dependencies (cache layer)
# -----------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
# Cache do store pnpm entre builds (BuildKit na VPS)
RUN --mount=type=cache,id=pnpm-store-frontend,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# -----------------------------
# Build (só invalida quando src/* muda)
# -----------------------------
FROM deps AS builder

# NEXT_PUBLIC_* são inlined no bundle pelo compilador — devem existir em build-time.
# Passe via .env na VPS: docker compose build --build-arg NEXT_PUBLIC_API_URL=...
# ou defina no docker-compose.yml > build > args (lê do .env automaticamente).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ORGANIZER_APP_HOST
ARG NEXT_PUBLIC_ROOT_SITE_URL
ARG NEXT_PUBLIC_BRASPAG_3DS_ENV
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG ENABLE_TRACKING_SCRIPTS

# Em VPS pequena (1 GB RAM) reduza para 768. Ajuste no .env ou compose.
ARG NODE_MAX_OLD_SPACE_SIZE=1024

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_ORGANIZER_APP_HOST=$NEXT_PUBLIC_ORGANIZER_APP_HOST \
    NEXT_PUBLIC_ROOT_SITE_URL=$NEXT_PUBLIC_ROOT_SITE_URL \
    NEXT_PUBLIC_BRASPAG_3DS_ENV=$NEXT_PUBLIC_BRASPAG_3DS_ENV \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    ENABLE_TRACKING_SCRIPTS=$ENABLE_TRACKING_SCRIPTS \
    NODE_OPTIONS=--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}

COPY . .

# Cache do .next/cache entre deploys — builds incrementais do Next.js são 5-10× mais rápidos
RUN --mount=type=cache,id=nextjs-build-cache,target=/app/.next/cache \
    pnpm run build

# -----------------------------
# Production
# -----------------------------
FROM node:20-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

WORKDIR /app

# --chown no COPY evita RUN chown -R posterior, que duplica todos os inodes
# de standalone em uma nova layer enorme
COPY --chown=nextjs:nodejs --from=builder /app/public           ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static     ./.next/static

# ---------------------------------------------------------------------------
# sharp — binário nativo do otimizador de imagem do Next (/_next/image).
# O output `standalone` + store SIMLINKADO do pnpm NÃO empacota de forma
# confiável os pacotes nativos `@img/sharp-*` no node_modules traçado → em
# runtime o otimizador estoura 500 (e o Cloudflare à frente devolve 520/525).
#
# Estratégia (à prova de versão):
#  1) Instala o sharp num diretório PRÓPRIO (/app/node_modules_native). Instalar
#     direto em /app não funciona: rodar `npm install` lá quebra ("...reading
#     'matches'") por causa do node_modules parcial do standalone, e mesclar por
#     cima falha porque as entradas do standalone são SYMLINKS (pnpm) — `cp` de
#     um dir sobre um symlink dá "is not a directory". Um dir próprio e limpo
#     evita os dois problemas. Base node:20-alpine = MESMA plataforma do runtime
#     (musl) → o npm baixa o binário `@img/sharp-linuxmusl-<arch>` correto.
#  2) Remove os symlinks `sharp`/`@img` do standalone p/ não sombrearem a versão
#     nativa recém-instalada.
#  3) Aponta NODE_PATH p/ o dir próprio: o `require('sharp')` do otimizador (e o
#     `require('@img/...')` interno do sharp) resolvem por ali. O ENV persiste no
#     runtime. O `require('sharp')` a seguir FALHA O BUILD se o binário não
#     carregar — erro explícito de build em vez de 500 silencioso em runtime.
# Versão fixada = a mesma do package.json (manter em sincronia).
ENV NODE_PATH=/app/node_modules_native
RUN mkdir -p /tmp/sharp && cd /tmp/sharp \
 && npm init -y >/dev/null 2>&1 \
 && npm install --omit=dev --no-audit --no-fund --loglevel=error sharp@0.35.3 \
 && mkdir -p /app/node_modules_native \
 && cp -a node_modules/. /app/node_modules_native/ \
 && cd /app && rm -rf /tmp/sharp node_modules/sharp node_modules/@img \
 && node -e "const s=require('sharp');console.log('sharp OK',s.versions)" \
 && chown -R nextjs:nodejs /app/node_modules_native

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

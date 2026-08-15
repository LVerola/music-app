ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# O standalone do Next com pnpm deixa @swc/helpers só com cjs/; o server.js pede esm/.
RUN corepack enable pnpm && pnpm build \
  && origem="$(dirname "$(find node_modules/.pnpm -path '*/node_modules/@swc/helpers/package.json' | head -n 1)")" \
  && destino="$(dirname "$(find .next/standalone -path '*/node_modules/@swc/helpers/package.json' | head -n 1)")" \
  && cp -a "$origem/." "$destino/"

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN mkdir .next && chown node:node .next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]

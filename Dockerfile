# syntax=docker/dockerfile:1

FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Sandbox tools are disabled, so there is no sandbox template to prepare.
RUN pnpm build --skip-sandbox-prewarm

FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build /app/.output ./.output

RUN mkdir -p .eve/.workflow-data && chown -R node:node .eve
VOLUME ["/app/.eve/.workflow-data"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/eve/v1/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]

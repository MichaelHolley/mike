# syntax=docker/dockerfile:1

# Build with the repo root as context: the relay installs from the root lockfile so its eve
# version always matches the agent's.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY relay/main.ts relay/
USER node
CMD ["node", "relay/main.ts"]

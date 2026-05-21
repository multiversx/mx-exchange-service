# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# tini reaps zombies and forwards SIGTERM so the Node process shuts down cleanly under Kubernetes.
# Pre-create logs/ owned by node so winston's File transport (when LOG_FILE is set) can write there.
RUN apk add --no-cache tini && \
    install -d -o node -g node /app/logs

COPY --chown=node:node --from=build /app /app
USER node
EXPOSE 3005
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]

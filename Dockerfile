# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# tini reaps zombies and forwards SIGTERM so the Node process shuts down cleanly under Kubernetes.
RUN apk add --no-cache tini
USER node
COPY --chown=node:node --from=build /app /app
EXPOSE 3005
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]

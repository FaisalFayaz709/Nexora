FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json eslint.config.mjs .prettierrc.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY worker/package.json worker/package.json
COPY shared/package.json shared/package.json
COPY database/package.json database/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @nexora/worker build
CMD ["pnpm", "--filter", "@nexora/worker", "start"]

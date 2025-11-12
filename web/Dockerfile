FROM node:20-alpine AS base

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

COPY web/package.json web/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY web /app
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start", "--port", "3000", "--hostname", "0.0.0.0"]

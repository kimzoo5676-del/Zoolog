# 화면 이미지: React 빌드 결과를 Caddy가 직접 제공 (2026-10-12 결정: /api·로그인 주소만 Spring으로 전달)
# 빌드는 CI(GitHub Actions)에서 이 Dockerfile로 (서버에서 빌드하지 않음)
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2.11-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build/client /srv

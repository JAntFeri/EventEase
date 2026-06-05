
#Zig layer
FROM alpine:3.19 AS backend_builder

RUN apk add --no-cache curl xz && \
    curl -L https://ziglang.org/download/0.16.0/zig-x86_64-linux-0.16.0.tar.xz | \
    tar -xJ -C /usr/local && \
    ln -s /usr/local/zig-x86_64-linux-0.16.0/zig /usr/local/bin/zig

WORKDIR /app/backend/

COPY backend/logic/build.zig backend/logic/build.zig.zon* ./
COPY backend/logic/src/ ./src/

RUN zig build -Doptimize=ReleaseFast -Dtarget=x86_64-linux-musl

#React layer
FROM node:24-alpine3.22 AS frontend_builder

WORKDIR /app/frontend

COPY frontend/EventEase/package.json frontend/EventEase/package-lock.json* ./

RUN --mount=type=cache,id=$(cacheKey)-npm,target=/root/.npm npm ci

COPY frontend/EventEase/ .

RUN npm run build

# 3.Ngix

FROM nginx:1.27-alpine AS final

USER root

RUN apk add --no-cache libc6-compat

RUN adduser -D -H ziguser

COPY --from=backend_builder /app/backend/zig-out/bin/ /usr/local/bin/

COPY --chown=nginx:nginx --from=frontend_builder /app/frontend/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf


EXPOSE 8080
CMD ["/bin/sh", "-c", "su ziguser -c \"DATABASE_URL=$DATABASE_URL /usr/local/bin/logic\" & exec nginx -g 'daemon off;'"]
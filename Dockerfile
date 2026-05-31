
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

RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend/EventEase/ .

RUN npm run build

# =========================================
# Stage 2: Prepare Nginx to Serve Static Files
# =========================================

FROM nginx:1.27-alpine AS final

USER root

# Install any minimal runtime dependencies if needed by Zig (usually none for static binaries)
RUN apk add --no-cache libc6-compat

# Create a non-root user for the backend process
RUN adduser -D -H ziguser

# 1. Copy the Zig binary from backend_builder
COPY --from=backend_builder /app/backend/zig-out/bin/ /usr/local/bin/

# 2. Copy the static frontend files from frontend_builder to Nginx
# (Adjust "dist" or "build" depending on your Vite/CRA config)
COPY --chown=nginx:nginx --from=frontend_builder /app/frontend/dist /usr/share/nginx/html

# 3. Copy custom Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Setup a startup script to run both processes

# Expose port 8080 for HTTP traffic (Nginx)
EXPOSE 8080
CMD ["/bin/sh", "-c", "su ziguser -c \"DATABASE_URL=$DATABASE_URL /usr/local/bin/logic\" & exec nginx -g 'daemon off;'"]
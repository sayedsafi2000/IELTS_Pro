# ── client/Dockerfile ──────────────────────────────────────────────
# Stage 1: build the Vite app
FROM node:20-alpine AS build
WORKDIR /app

# VITE_API_URL is baked in at build time. Default '/api' lets nginx
# proxy API calls to the backend on the same origin (no CORS needed).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: serve via nginx + reverse-proxy /api and /uploads to the server
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

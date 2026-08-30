# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# VITE_API_URL is baked into the built JS at build time (Vite env vars are
# compile-time, not runtime). The default matches the docker-compose setup:
# the browser (running on your host machine, not inside a container) talks
# to the server on its published port directly. Override at build time with:
#   docker build --build-arg VITE_API_URL=https://your-domain.com/api .
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
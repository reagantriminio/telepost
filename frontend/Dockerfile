# ---- build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# copy source and build
COPY . .
RUN npm run build

# ---- production stage ----
FROM nginx:alpine

# copy custom nginx config if it exists
COPY nginx.conf /etc/nginx/conf.d/default.conf

# static files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 
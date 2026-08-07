# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

#####################

COPY . .

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

ARG VITE_API_DEBUG
ENV VITE_API_DEBUG=$VITE_API_DEBUG

RUN npm run build

# Stage 2: Serve the application with Nginx
# Sử dụng image Nginx nhẹ để phục vụ ứng dụng đã build
# FROM nginx:alpine

FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
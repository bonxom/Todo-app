# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

#####################

COPY . .

# RUN npm run build

# Stage 2: Serve the application with Nginx
# Sử dụng image Nginx nhẹ để phục vụ ứng dụng đã build
# FROM nginx:alpine

# COPY --from=builder /app/dist /usr/share/nginx/html

# Cổng của frontend
EXPOSE 5000 


# CMD ["nginx", "-g", "daemon off;"]
CMD ["npm", "run", "dev"]
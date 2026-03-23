# Stage 1: Build the React Application
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx for Production
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Update Nginx config to handle React Router if needed
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

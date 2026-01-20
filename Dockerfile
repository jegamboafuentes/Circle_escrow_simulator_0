# Stage 1: Build the React application
FROM node:20-alpine as build

WORKDIR /app

# Copy package.json
COPY package.json ./

# Change this line to use 'npm install'
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve the app using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
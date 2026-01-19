# Stage 1: Build the React application
FROM node:20-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the app (generates the 'dist' folder)
RUN npm run build

# Stage 2: Serve the app using Nginx
FROM nginx:alpine

# Copy the build output from the previous stage to Nginx's html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (we will create this in Step 2)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (Cloud Run's default)
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
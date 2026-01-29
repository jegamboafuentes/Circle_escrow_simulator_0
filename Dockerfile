# Stage 1: Build the React application
FROM node:20-alpine as build

WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN npm install

# --- START: Add Build Arguments ---
# 1. Declare the arguments (passed from Cloud Build)
ARG VITE_CIRCLE_API_KEY
ARG VITE_NETWORK
ARG VITE_ESCROW_ADDRESS

# 2. Map them to Environment Variables (so Vite can see them)
ENV VITE_CIRCLE_API_KEY=$VITE_CIRCLE_API_KEY
ENV VITE_NETWORK=$VITE_NETWORK
ENV VITE_ESCROW_ADDRESS=$VITE_ESCROW_ADDRESS
# --- END: Add Build Arguments ---

# Copy the rest of the source code
COPY . .

# Build the app (Now it can "see" the variables above!)
RUN npm run build

# Stage 2: Serve the app using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
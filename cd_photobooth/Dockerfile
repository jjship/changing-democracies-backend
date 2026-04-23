FROM node:22.12-alpine AS base
WORKDIR /cd_photobooth
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_API_KEY
ARG VITE_STORAGE_PULL_ZONE
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_KEY=${VITE_API_KEY}
ENV VITE_STORAGE_PULL_ZONE=${VITE_STORAGE_PULL_ZONE}
RUN npm run build

# Production stage
FROM node:22.12-alpine AS production
WORKDIR /cd_photobooth
COPY --from=builder /cd_photobooth/dist ./dist
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "80"]

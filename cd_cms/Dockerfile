FROM node:26.13-alpine AS base
WORKDIR /cd_cms
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
ARG VITE_BACKEND_URL
ARG VITE_LIBRARY_ID
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_LIBRARY_ID=${VITE_LIBRARY_ID}
RUN npm run build

# Production stage
FROM node:26.13-alpine AS production
WORKDIR /cd_cms
COPY --from=builder /cd_cms/dist ./dist
RUN npm install -g serve

CMD ["serve", "-s", "dist", "-l", "80"]
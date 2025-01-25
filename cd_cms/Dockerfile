FROM node:22.12-alpine AS base
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
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_BACKEND_URL
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
RUN npm run build

# Production stage
FROM node:22.12-alpine AS production
WORKDIR /cd_cms
COPY --from=builder /cd_cms/dist ./dist
RUN npm install -g serve

CMD ["serve", "-s", "dist", "-l", "80"]
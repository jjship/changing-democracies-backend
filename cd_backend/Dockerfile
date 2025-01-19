FROM node:22.12-alpine as base
WORKDIR /cd_backend
COPY package*.json ./

# Development stage
FROM base as development
RUN npm install
COPY . .
CMD ["npm", "start"]

# Build stage
FROM base as builder
RUN npm ci
COPY . .
RUN echo "Building TypeScript..." && \
    npm run build && \
    echo "Build complete, contents of dist:" && \
    ls -la dist/

# Production stage
FROM base as production
RUN npm ci --omit=dev
COPY --from=builder /cd_backend/dist ./dist
COPY --from=builder /cd_backend/package*.json ./
ENV NODE_ENV=production
CMD ["npm", "run", "start:prod"]
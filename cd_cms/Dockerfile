FROM node:22.12-alpine as base
WORKDIR /cd_cms
COPY package*.json ./

# Development stage
FROM base as development
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Build stage
FROM base as builder
RUN npm ci
COPY . .
RUN echo "Building Vite app..." && \
    npm run build && \
    echo "Build complete, contents of dist:" && \
    ls -la dist/

# Production stage
FROM base as production
RUN npm ci --omit=dev
COPY --from=builder /cd_cms/dist ./dist
EXPOSE 5173
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
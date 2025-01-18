FROM node:22.12-alpine as base
WORKDIR /cd_backend
COPY package*.json ./

# Development stage
FROM base as development
RUN npm install
COPY . .
CMD ["npm", "start"]

# Production stage
FROM base as production
RUN npm ci
COPY . .
RUN npm run build
RUN npm ci --omit=dev
ENV NODE_ENV=production
CMD ["npm", "run", "start:prod"]
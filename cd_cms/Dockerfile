FROM node:22.12-alpine as base
WORKDIR /cd_cms
COPY package*.json ./

# Development stage
FROM base as development
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Production stage
FROM base as production
RUN npm ci
COPY . .
RUN npm run build
RUN npm ci --omit=dev
EXPOSE 5173
CMD ["npm", "run", "start"]
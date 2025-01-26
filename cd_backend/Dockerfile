FROM node:22.12-alpine AS base
RUN apk add --no-cache bash python3 make g++ sqlite sqlite-dev
WORKDIR /cd_backend
COPY package*.json ./

FROM base AS development
RUN npm install
RUN mkdir -p /cd_backend/data
COPY . .
CMD ["npm", "start"]

FROM base AS builder
RUN npm ci --omit=optional
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:22.12-alpine AS production
WORKDIR /cd_backend
ENV NODE_ENV=production
RUN apk add --no-cache bash dumb-init sqlite

RUN mkdir -p /cd_backend/data
COPY --from=builder /cd_backend/dist/. ./
COPY --from=builder /cd_backend/package.json ./ 
COPY --from=builder /cd_backend/node_modules ./node_modules

RUN chown -R node:node /cd_backend
USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "main.js"]

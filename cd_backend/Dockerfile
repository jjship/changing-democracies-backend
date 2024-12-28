FROM node:22.12-alpine

WORKDIR /cd_backend

COPY package*.json ./
RUN npm i

COPY . .

CMD ["npm", "run", "start"]
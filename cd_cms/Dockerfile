FROM node:22.12-alpine

WORKDIR /cd_cms

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
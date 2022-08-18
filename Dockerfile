FROM node

WORKDIR /eventapp-backend

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm","start"]
FROM node

WORKDIR /eventapp-backend-github

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm","start"]
FROM node:18-buster

WORKDIR /matchup-back

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
EXPOSE 3001

CMD ["node", "./lib/app.js"]
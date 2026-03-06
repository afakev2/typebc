FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# تشغيل مباشر
ENTRYPOINT ["node", "index.js"]

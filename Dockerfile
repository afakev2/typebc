FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# لا نحتاج منفذ لأنها Worker service
CMD ["node", "index.js"]

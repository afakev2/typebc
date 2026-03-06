FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# تجاهل مشكلة المنفذ
ENV PORT=10000

# تشغيل البوت
CMD ["sh", "-c", "node index.js & while true; do sleep 1000; done"]

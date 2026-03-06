FROM node:18-slim

WORKDIR /app

# تثبيت الاعتماديات
COPY package*.json ./
RUN npm install

# نسخ الملفات
COPY . .

# تشغيل البوت
CMD ["npm", "start"]

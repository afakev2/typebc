FROM node:18-slim

WORKDIR /app

# نسخ ملفات package اولاً (للاستفادة من الـ caching)
COPY package*.json ./

# تثبيت الاعتماديات
RUN npm ci --only=production

# نسخ باقي الملفات
COPY . .

# تشغيل البوت مباشرة بدون npm start
CMD ["node", "index.js"]

FROM node:18-slim

WORKDIR /app

# نسخ ملفات package أولاً لتحسين caching
COPY package*.json ./

# تثبيت dependencies
RUN npm install --production

# نسخ باقي الملفات
COPY . .

# تشغيل البوت مع إعادة التشغيل التلقائي
CMD ["node", "index.js"]

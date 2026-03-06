// ========== حل مشكلة Render Port ==========
const http = require('http');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        bot: 'discord-self-bot',
        message: 'البوت شغال ✅',
        time: new Date().toLocaleString('ar-EG')
    });
});

// إنشاء خادم وهمي
const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 منفذ وهمي مفتوح على: ${PORT}`);
    console.log(`🔗 Render يعتقد أن الخدمة ويب - تم الخداع بنجاح!`);
});

// ========== باقي كود البوت ==========
const { Client } = require('discord.js-selfbot-v13');
const client = new Client();

// الإعدادات الثابتة (عدليها هنا مباشرة)
const CONFIG = {
    BOT_WORD: "-كت",
    RESEND_TIME_SECONDS: 1140, // 19 دقيقة
    AUTO_STOP: {
        ENABLED: true,
        WORK_TIME_MINUTES: 60,  // يعمل ساعة
        REST_TIME_MINUTES: 80,   // يرتاح 80 دقيقة
    }
};

// المتغيرات من Render
const TOKEN = process.env.DISCORD_TOKEN;
const SERVER_ID = process.env.SERVER_ID || "1058648328558088242";
const ORDERS_CHANNEL_ID = process.env.ORDERS_CHANNEL_ID || "1122121488452026388";

// التحقق من التوكن
if (!TOKEN) {
    console.error('❌ خطأ: DISCORD_TOKEN غير موجود');
    process.exit(1);
}

// متغيرات التحكم
let isActive = true;
let restTimeout = null;
let messageInterval = null;

// دالة إرسال الكلمة
async function sendWord() {
    try {
        if (!isActive) {
            console.log('⏸️ البوت في وضع الراحة');
            return;
        }

        const channel = await client.channels.fetch(ORDERS_CHANNEL_ID);
        if (!channel) {
            console.error('❌ الروم غير موجود');
            return;
        }

        if (channel.guild.id !== SERVER_ID) {
            console.error('❌ الروم ليس في السيرفر الصحيح');
            return;
        }

        await channel.send(CONFIG.BOT_WORD);
        
        const now = new Date().toLocaleTimeString('ar-EG');
        console.log(`✅ [${now}] تم إرسال: "${CONFIG.BOT_WORD}"`);
        
    } catch (error) {
        console.error('❌ خطأ في الإرسال:', error.message);
    }
}

// نظام الحماية (ايقاف تلقائي)
function setupAutoStop() {
    if (!CONFIG.AUTO_STOP.ENABLED) return;

    const workMs = CONFIG.AUTO_STOP.WORK_TIME_MINUTES * 60 * 1000;
    const restMs = CONFIG.AUTO_STOP.REST_TIME_MINUTES * 60 * 1000;

    console.log(`🕐 نظام الحماية:`);
    console.log(`   - يعمل: ${CONFIG.AUTO_STOP.WORK_TIME_MINUTES} دقيقة`);
    console.log(`   - يرتاح: ${CONFIG.AUTO_STOP.REST_TIME_MINUTES} دقيقة`);

    function startWork() {
        isActive = true;
        console.log(`▶️ [${new Date().toLocaleTimeString('ar-EG')}] بدء العمل`);
        sendWord();

        if (restTimeout) clearTimeout(restTimeout);
        restTimeout = setTimeout(() => {
            isActive = false;
            console.log(`⏸️ [${new Date().toLocaleTimeString('ar-EG')}] بدء الراحة`);
            setTimeout(startWork, restMs);
        }, workMs);
    }

    startWork();
}

client.on('ready', () => {
    console.log('=================================');
    console.log(`✅ تم تسجيل الدخول كـ ${client.user.tag}`);
    console.log(`📋 السيرفر: ${SERVER_ID}`);
    console.log(`📢 الروم: ${ORDERS_CHANNEL_ID}`);
    console.log(`🔤 الكلمة: "${CONFIG.BOT_WORD}"`);
    console.log(`⏱️ كل: ${CONFIG.RESEND_TIME_SECONDS} ثانية`);
    console.log('=================================');

    // بدء الإرسال المتكرر
    messageInterval = setInterval(sendWord, CONFIG.RESEND_TIME_SECONDS * 1000);
    
    // تشغيل نظام الحماية
    setupAutoStop();
});

// معالجة الأخطاء
client.on('error', (error) => {
    console.error('❌ خطأ:', error.message);
});

// تسجيل الدخول
async function login() {
    try {
        await client.login(TOKEN);
    } catch (error) {
        console.error('❌ فشل تسجيل الدخول:', error.message);
        setTimeout(login, 10000);
    }
}

login();

// نبض القلب - يمنع إغلاق البوت
setInterval(() => {
    console.log(`💓 البوت شغال... ${new Date().toLocaleTimeString('ar-EG')}`);
}, 60000);

// تنظيف عند الإغلاق
process.on('SIGTERM', () => {
    console.log('👋 إيقاف البوت...');
    clearInterval(messageInterval);
    clearTimeout(restTimeout);
    server.close();
    process.exit(0);
});

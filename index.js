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

app.get('/status', (req, res) => {
    res.json({
        bot: 'discord-self-bot',
        active: isActive,
        workMode: workMode,
        uptime: process.uptime(),
        lastMessage: lastMessageTime ? new Date(lastMessageTime).toLocaleString('ar-EG') : 'لم يرسل بعد',
        nextMessage: nextMessageTime ? new Date(nextMessageTime).toLocaleString('ar-EG') : 'غير معروف',
        workEndTime: workEndTime ? new Date(workEndTime).toLocaleString('ar-EG') : 'غير معروف',
        restEndTime: restEndTime ? new Date(restEndTime).toLocaleString('ar-EG') : 'غير معروف'
    });
});

// إنشاء خادم وهمي
const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 منفذ وهمي مفتوح على: ${PORT}`);
});

// ========== باقي كود البوت ==========
const { Client } = require('discord.js-selfbot-v13');
const client = new Client();

// استيراد الإعدادات من config.js
const CONFIG = require('./config.js');

// المتغيرات من Render
const TOKEN = process.env.DISCORD_TOKEN;
const SERVER_ID = process.env.SERVER_ID || CONFIG.DEFAULT_SERVER_ID;
const ORDERS_CHANNEL_ID = process.env.ORDERS_CHANNEL_ID || CONFIG.DEFAULT_CHANNEL_ID;

// متغيرات لتتبع الحالة
let isActive = true;
let workMode = 'working'; // 'working' أو 'resting'
let messageInterval = null;
let lastMessageTime = null;
let nextMessageTime = null;
let workEndTime = null;
let restEndTime = null;

// التحقق من التوكن
if (!TOKEN) {
    console.error('❌ خطأ: DISCORD_TOKEN غير موجود');
    process.exit(1);
}

// التحقق من الإعدادات
if (!SERVER_ID || !ORDERS_CHANNEL_ID) {
    console.error('❌ خطأ: SERVER_ID أو ORDERS_CHANNEL_ID غير موجود');
    process.exit(1);
}

// دالة إرسال الكلمة
async function sendWord() {
    try {
        if (workMode === 'resting') {
            console.log(`⏸️ [${new Date().toLocaleTimeString('ar-EG')}] في وضع الراحة - لن يتم الإرسال`);
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
        
        const now = new Date();
        lastMessageTime = now;
        nextMessageTime = new Date(now.getTime() + (CONFIG.RESEND_TIME_SECONDS * 1000));
        
        console.log(`✅ [${now.toLocaleTimeString('ar-EG')}] تم إرسال: "${CONFIG.BOT_WORD}"`);
        
    } catch (error) {
        console.error('❌ خطأ في الإرسال:', error.message);
    }
}

// نظام الحماية المحسن
function setupAutoStop() {
    if (!CONFIG.AUTO_STOP.ENABLED) {
        console.log('🔄 نظام الحماية معطل - البوت سيعمل باستمرار');
        workMode = 'working';
        isActive = true;
        return;
    }

    const workMs = CONFIG.AUTO_STOP.WORK_TIME_MINUTES * 60 * 1000;
    const restMs = CONFIG.AUTO_STOP.REST_TIME_MINUTES * 60 * 1000;

    console.log('=================================');
    console.log('🕐 نظام الحماية المحسن:');
    console.log(`   - يعمل: ${CONFIG.AUTO_STOP.WORK_TIME_MINUTES} دقيقة`);
    console.log(`   - يرتاح: ${CONFIG.AUTO_STOP.REST_TIME_MINUTES} دقيقة`);
    console.log('=================================');

    function startWork() {
        workMode = 'working';
        isActive = true;
        const now = new Date();
        workEndTime = new Date(now.getTime() + workMs);
        
        console.log(`▶️ [${now.toLocaleTimeString('ar-EG')}] بدء العمل`);
        console.log(`⏱️ ينتهي العمل: ${workEndTime.toLocaleTimeString('ar-EG')}`);
        
        // إرسال رسالة فورية عند بدء العمل
        sendWord();
        
        // جدولة نهاية العمل
        setTimeout(() => {
            startRest();
        }, workMs);
    }

    function startRest() {
        workMode = 'resting';
        isActive = false;
        const now = new Date();
        restEndTime = new Date(now.getTime() + restMs);
        
        console.log(`⏸️ [${now.toLocaleTimeString('ar-EG')}] بدء الراحة لمدة ${CONFIG.AUTO_STOP.REST_TIME_MINUTES} دقيقة`);
        console.log(`⏱️ تنتهي الراحة: ${restEndTime.toLocaleTimeString('ar-EG')}`);
        
        // جدولة نهاية الراحة
        setTimeout(() => {
            startWork();
        }, restMs);
    }

    // بدء الدورة
    startWork();
}

client.on('ready', () => {
    console.log('=================================');
    console.log('✅ تم تسجيل الدخول بنجاح');
    console.log(`👤 الحساب: ${client.user.tag}`);
    console.log(`🆔 الآيدي: ${client.user.id}`);
    console.log('=================================');
    console.log(`📋 السيرفر: ${SERVER_ID}`);
    console.log(`📢 الروم: ${ORDERS_CHANNEL_ID}`);
    console.log(`🔤 الكلمة: "${CONFIG.BOT_WORD}"`);
    console.log(`⏱️ التكرار: كل ${CONFIG.RESEND_TIME_SECONDS} ثانية (${CONFIG.RESEND_TIME_SECONDS / 60} دقيقة)`);
    console.log('=================================');

    // إلغاء أي إنترفال سابق
    if (messageInterval) {
        clearInterval(messageInterval);
    }
    
    // بدء الإرسال المتكرر (كل دقيقة للتأكد من الدقة)
    messageInterval = setInterval(sendWord, CONFIG.RESEND_TIME_SECONDS * 1000);
    
    // تشغيل نظام الحماية
    setupAutoStop();
    
    // حساب وقت أول رسالة
    nextMessageTime = new Date(Date.now() + (CONFIG.RESEND_TIME_SECONDS * 1000));
});

// معالجة الأخطاء
client.on('error', (error) => {
    console.error('❌ خطأ في الاتصال:', error.message);
});

// محاولة تسجيل الدخول
async function login() {
    try {
        console.log('🔄 جاري تسجيل الدخول...');
        await client.login(TOKEN);
    } catch (error) {
        console.error('❌ فشل تسجيل الدخول:', error.message);
        console.log('🔄 محاولة مرة أخرى بعد 10 ثوان...');
        setTimeout(login, 10000);
    }
}

login();

// نبض القلب المحسن - يمنع إغلاق البوت ويعرض الحالة بدقة
setInterval(() => {
    const now = new Date();
    let status = '';
    let timeInfo = '';
    
    if (workMode === 'working') {
        status = '🟢 يعمل';
        if (workEndTime) {
            const remaining = Math.round((workEndTime - now) / 1000 / 60);
            timeInfo = ` - متبقي: ${remaining} دقيقة`;
        }
    } else {
        status = '🟡 في الراحة';
        if (restEndTime) {
            const remaining = Math.round((restEndTime - now) / 1000 / 60);
            timeInfo = ` - متبقي: ${remaining} دقيقة`;
        }
    }
    
    console.log(`💓 البوت ${status}${timeInfo} - ${now.toLocaleTimeString('ar-EG')}`);
}, 30000); // كل 30 ثانية بدلاً من 60 ثانية

// تنظيف عند الإغلاق
process.on('SIGTERM', () => {
    console.log('👋 جاري إيقاف البوت...');
    if (messageInterval) clearInterval(messageInterval);
    server.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 جاري إيقاف البوت...');
    if (messageInterval) clearInterval(messageInterval);
    server.close();
    process.exit(0);
});

// عرض المسارات المتاحة
console.log('=================================');
console.log('🚀 البوت جاهز للتشغيل');
console.log('📌 المسارات المتاحة:');
console.log('   - / : الصفحة الرئيسية');
console.log('   - /status : حالة البوت');
console.log('=================================');

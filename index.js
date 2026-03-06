require('./keep_alive.js');  // <-- أضف هذا السطر

const { Client } = require('discord.js-selfbot-v13');
const config = require('./config.js');
const client = new Client();
const { Client } = require('discord.js-selfbot-v13');
const config = require('./config.js');
const client = new Client();
// المتغيرات من Render Environment
config.TOKEN = process.env.DISCORD_TOKEN;
config.SERVER_ID = process.env.SERVER_ID;
config.ORDERS_CHANNEL_ID = process.env.ORDERS_CHANNEL_ID;

// التحقق من الإعدادات
if (!config.TOKEN || !config.SERVER_ID || !config.ORDERS_CHANNEL_ID) {
    console.error('❌ خطأ: تأكد من وضع جميع المتغيرات في Render');
    console.error('المتغيرات المطلوبة: DISCORD_TOKEN, SERVER_ID, ORDERS_CHANNEL_ID');
    process.exit(1);
}

// متغيرات التحكم
let isActive = true;
let workInterval = null;
let restTimeout = null;
let messageInterval = null;

// دالة إرسال الكلمة المحددة
async function sendWord() {
    try {
        if (!isActive) {
            console.log('⏸️ البوت في وضع الراحة - لن يرسل الآن');
            return;
        }

        const channel = await client.channels.fetch(config.ORDERS_CHANNEL_ID);
        if (!channel) {
            console.error('❌ لا يمكن العثور على الروم');
            return;
        }

        // التأكد من أننا في السيرفر الصحيح
        if (channel.guild.id !== config.SERVER_ID) {
            console.error('❌ الروم ليس في السيرفر المحدد');
            return;
        }

        // إرسال الكلمة من ملف الإعدادات
        await channel.send(config.BOT_WORD);
        
        const now = new Date().toLocaleTimeString('ar-EG');
        console.log(`✅ [${now}] تم إرسال: "${config.BOT_WORD}"`);
        
    } catch (error) {
        console.error('❌ خطأ في الإرسال:', error.message);
    }
}

// دالة إدارة الإيقاف التلقائي
function setupAutoStop() {
    if (!config.AUTO_STOP.ENABLED) {
        console.log('⚠️ ميزة الإيقاف التلقائي معطلة - البوت سيعمل باستمرار');
        return;
    }

    const workMs = config.AUTO_STOP.WORK_TIME_MINUTES * 60 * 1000;
    const restMs = config.AUTO_STOP.REST_TIME_MINUTES * 60 * 1000;

    console.log(`🕐 إعدادات الحماية:`);
    console.log(`   - مدة العمل: ${config.AUTO_STOP.WORK_TIME_MINUTES} دقيقة`);
    console.log(`   - مدة الراحة: ${config.AUTO_STOP.REST_TIME_MINUTES} دقيقة`);

    function startWorkPeriod() {
        isActive = true;
        const now = new Date().toLocaleTimeString('ar-EG');
        console.log(`▶️ [${now}] بدء فترة العمل - البوت يعمل`);

        // إرسال رسالة فور بدء العمل
        sendWord();

        // جدولة فترة الراحة بعد انتهاء العمل
        if (restTimeout) clearTimeout(restTimeout);
        restTimeout = setTimeout(() => {
            isActive = false;
            const restNow = new Date().toLocaleTimeString('ar-EG');
            console.log(`⏸️ [${restNow}] بدء فترة الراحة - البوت متوقف لمدة ${config.AUTO_STOP.REST_TIME_MINUTES} دقيقة`);
            
            // بعد انتهاء الراحة، نبدأ دورة جديدة
            setTimeout(startWorkPeriod, restMs);
        }, workMs);
    }

    // بدء الدورة الأولى
    startWorkPeriod();
}

client.on('ready', async () => {
    console.log('=================================');
    console.log(`✅ تم تسجيل الدخول كـ ${client.user.tag}`);
    console.log(`📋 السيرفر المحدد: ${config.SERVER_ID}`);
    console.log(`📢 روم الطلبات: ${config.ORDERS_CHANNEL_ID}`);
    console.log(`🔤 الكلمة المرسلة: "${config.BOT_WORD}"`);
    console.log(`⏱️ وقت الإرسال: ${config.RESEND_TIME_SECONDS} ثانية`);
    console.log('=================================');

    // بدء التكرار حسب الوقت المحدد
    const intervalMs = config.RESEND_TIME_SECONDS * 1000;
    messageInterval = setInterval(sendWord, intervalMs);
    
    console.log(`🔄 سيتم الإرسال كل ${config.RESEND_TIME_SECONDS} ثانية`);

    // تشغيل نظام الإيقاف التلقائي
    setupAutoStop();
});

// معالجة أخطاء الاتصال
client.on('error', (error) => {
    console.error('❌ خطأ في الاتصال:', error.message);
});

client.on('disconnect', () => {
    console.log('⚠️ تم فصل الاتصال - محاولة إعادة الاتصال...');
});

// تسجيل الدخول مع معالجة أفضل للأخطاء
async function login() {
    try {
        await client.login(config.TOKEN);
    } catch (error) {
        console.error('❌ فشل تسجيل الدخول:', error.message);
        if (error.message.includes('TOKEN')) {
            console.error('📝 تأكد من وضع التوكن الصحيح في متغيرات Render');
        }
        console.log('🔄 محاولة إعادة الاتصال بعد 10 ثواني...');
        setTimeout(login, 10000);
    }
}

login();

// تنظيف عند الإغلاق
process.on('SIGINT', () => {
    console.log('\n👋 إيقاف البوت...');
    if (messageInterval) clearInterval(messageInterval);
    if (restTimeout) clearTimeout(restTimeout);
    if (workInterval) clearInterval(workInterval);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 تم استلام SIGTERM - إيقاف البوت...');
    if (messageInterval) clearInterval(messageInterval);
    if (restTimeout) clearTimeout(restTimeout);
    if (workInterval) clearInterval(workInterval);
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ خطأ غير متوقع:', error.message);
});

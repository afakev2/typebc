const { Client } = require('discord.js-selfbot-v13');
const client = new Client();

// المتغيرات من Render Environment
const TOKEN = process.env.DISCORD_TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const ORDERS_CHANNEL_ID = process.env.ORDERS_CHANNEL_ID;

// تخزين آخر رسالة أمر لكل مستخدم
const userLastOrders = new Map();

client.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول كـ ${client.user.tag}`);
    console.log(`📋 سيرفر محدد: ${SERVER_ID}`);
    console.log(`📢 روم الطلبات: ${ORDERS_CHANNEL_ID}`);
    
    // بدء التكرار كل 30 دقيقة
    setInterval(async () => {
        await resendOrders();
    }, 30 * 60 * 1000); // 30 دقيقة بالملي ثانية
});

// مراقبة الرسائل الجديدة
client.on('messageCreate', async (message) => {
    // تجاهل رسائل البوت نفسه
    if (message.author.id === client.user.id) return;
    
    // تحقق من السيرفر المحدد فقط
    if (message.guild?.id !== SERVER_ID) return;
    
    // تحقق من روم الطلبات
    if (message.channel.id !== ORDERS_CHANNEL_ID) return;
    
    // تخزين الأمر للمستخدم
    const userOrders = userLastOrders.get(message.author.id) || [];
    userOrders.push({
        content: message.content,
        timestamp: Date.now(),
        authorId: message.author.id,
        authorTag: message.author.tag
    });
    
    // الاحتفاظ بآخر 10 أوامر فقط لكل مستخدم
    if (userOrders.length > 10) {
        userOrders.shift();
    }
    
    userLastOrders.set(message.author.id, userOrders);
    console.log(`📝 أمر جديد من ${message.author.tag}: ${message.content.substring(0, 50)}...`);
});

// دالة إعادة إرسال الأوامر كل 30 دقيقة
async function resendOrders() {
    try {
        const channel = await client.channels.fetch(ORDERS_CHANNEL_ID);
        if (!channel) return;
        
        const now = Date.now();
        const thirtyMinutesAgo = now - (30 * 60 * 1000);
        
        // تجميع جميع الأوامر من آخر 30 دقيقة
        let ordersToResend = [];
        
        userLastOrders.forEach((orders, userId) => {
            const recentOrders = orders.filter(order => order.timestamp >= thirtyMinutesAgo);
            ordersToResend = ordersToResend.concat(recentOrders);
        });
        
        // ترتيب الأوامر حسب الوقت
        ordersToResend.sort((a, b) => a.timestamp - b.timestamp);
        
        if (ordersToResend.length === 0) {
            console.log('⏳ لا توجد أوامر جديدة لإعادة إرسالها');
            return;
        }
        
        // إنشاء رسالة موحدة
        let messageContent = '🔄 **إعادة إرسال أوامر آخر 30 دقيقة**\n\n';
        
        ordersToResend.forEach(order => {
            const time = new Date(order.timestamp).toLocaleTimeString('ar-EG');
            messageContent += `**[${time}] ${order.authorTag}:** ${order.content}\n`;
        });
        
        // تقسيم الرسالة إذا كانت طويلة
        if (messageContent.length > 2000) {
            const chunks = messageContent.match(/.{1,1900}/g) || [];
            for (const chunk of chunks) {
                await channel.send(chunk);
            }
        } else {
            await channel.send(messageContent);
        }
        
        console.log(`✅ تم إعادة إرسال ${ordersToResend.length} أمر`);
        
    } catch (error) {
        console.error('❌ خطأ في إعادة إرسال الأوامر:', error);
    }
}

// تسجيل الدخول
client.login(TOKEN).catch(err => {
    console.error('❌ فشل تسجيل الدخول:', err);
    process.exit(1);
});

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', error => {
    console.error('❌ خطأ غير معالج:', error);
});

const { Client } = require('discord.js-selfbot-v13');
const client = new Client();

// إضافة خادم HTTP وهمي لـ Render
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Discord Self Bot is running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 خادم HTTP وهمي يعمل على المنفذ ${PORT}`);
});

// المتغيرات من Render Environment
const TOKEN = process.env.DISCORD_TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const ORDERS_CHANNEL_ID = process.env.ORDERS_CHANNEL_ID;
const COMMANDS_CHANNEL_ID = process.env.COMMANDS_CHANNEL_ID || ORDERS_CHANNEL_ID;

// تخزين البيانات
const userLastOrders = new Map();
let botActive = true;
let intervalTime = 30 * 60 * 1000; // 30 دقيقة افتراضي
let checkInterval = null;
let triggerWord = null;

client.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول كـ ${client.user.tag}`);
    console.log(`📋 سيرفر محدد: ${SERVER_ID}`);
    console.log(`📢 روم الطلبات: ${ORDERS_CHANNEL_ID}`);
    console.log(`⚙️ روم الأوامر: ${COMMANDS_CHANNEL_ID}`);
    console.log(`🔧 البوت جاهز لاستقبال الأوامر في <#${COMMANDS_CHANNEL_ID}>`);
    
    startInterval();
    
    // إرسال رسالة تأكيد في روم الأوامر
    try {
        const channel = await client.channels.fetch(COMMANDS_CHANNEL_ID);
        if (channel) {
            await channel.send('🟢 **البوت جاهز للعمل!** استخدم `!help` لعرض الأوامر');
        }
    } catch (error) {
        console.error('❌ خطأ في إرسال رسالة الترحيب:', error);
    }
});

// بدء التكرار
function startInterval() {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(async () => {
        if (botActive) {
            await resendOrders();
        }
    }, intervalTime);
    console.log(`⏱️ تم ضبط التكرار كل ${intervalTime/60000} دقيقة`);
}

// دالة التحقق من الكلمة المحددة
function checkTriggerWord(content) {
    if (!triggerWord) return true;
    return content.toLowerCase().includes(triggerWord.toLowerCase());
}

// مراقبة جميع الرسائل
client.on('messageCreate', async (message) => {
    try {
        // تجاهل رسائل البوت نفسه
        if (message.author.id === client.user.id) return;
        
        // تحقق من السيرفر المحدد فقط
        if (message.guild?.id !== SERVER_ID) {
            console.log(`🚫 رسالة من سيرفر آخر: ${message.guild?.name || 'خاص'}`);
            return;
        }
        
        console.log(`📨 رسالة من ${message.author.tag} في <#${message.channel.id}>: ${message.content.substring(0, 50)}`);
        
        // التحقق من أوامر التحكم (في أي روم محدد للأوامر)
        if (message.channel.id === COMMANDS_CHANNEL_ID) {
            if (message.content.startsWith('!')) {
                console.log(`⚡ أمر مستلم: ${message.content}`);
                await handleCommand(message);
                return;
            }
        }
        
        // تخزين الأوامر فقط إذا البوت نشط وفي روم الطلبات
        if (message.channel.id === ORDERS_CHANNEL_ID && botActive) {
            // تحقق من الكلمة المحددة
            if (!checkTriggerWord(message.content)) return;
            
            const userOrders = userLastOrders.get(message.author.id) || [];
            userOrders.push({
                content: message.content,
                timestamp: Date.now(),
                authorId: message.author.id,
                authorTag: message.author.tag
            });
            
            // الاحتفاظ بآخر 20 أمر فقط لكل مستخدم
            if (userOrders.length > 20) {
                userOrders.shift();
            }
            
            userLastOrders.set(message.author.id, userOrders);
            console.log(`📝 تم تخزين أمر من ${message.author.tag}`);
        }
    } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة:', error);
    }
});

// معالجة الأوامر
async function handleCommand(message) {
    try {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        console.log(`🔧 تنفيذ الأمر: ${command}`);
        
        // أمر المساعدة
        if (command === 'help' || command === 'h') {
            const helpMsg = `
**📋 أوامر التحكم في البوت:**

🟢 **!start** - تشغيل البوت
🔴 **!stop** - إيقاف البوت
⏱️ **!time [عدد] [وحدة]** - تغيير وقت التكرار
   مثال: !time 15 دقيقة
   مثال: !time 45 ثانية

🔤 **!word [كلمة]** - تحديد كلمة معينة للتخزين
   مثال: !word بيتزا
   مثال: !word none - إلغاء التحديد

📊 **!status** - عرض حالة البوت
🧹 **!clear** - مسح جميع الأوامر المخزنة
📋 **!list** - عرض آخر 10 أوامر
🔄 **!test** - اختبار البوت

⚡ **الوقت الحالي:** ${intervalTime/60000} دقيقة
🔘 **الحالة:** ${botActive ? '🟢 نشط' : '🔴 متوقف'}
🔤 **الكلمة المحددة:** ${triggerWord || 'لا يوجد'}
`;
            await message.reply(helpMsg);
            console.log('✅ تم إرسال رسالة المساعدة');
        }
        
        // أمر تشغيل البوت
        else if (command === 'start') {
            if (!botActive) {
                botActive = true;
                await message.reply('✅ **تم تشغيل البوت**');
                console.log('🟢 البوت نشط');
            } else {
                await message.reply('⚠️ **البوت يعمل بالفعل**');
            }
        }
        
        // أمر إيقاف البوت
        else if (command === 'stop') {
            if (botActive) {
                botActive = false;
                await message.reply('⏸️ **تم إيقاف البوت**');
                console.log('🔴 البوت متوقف');
            } else {
                await message.reply('⚠️ **البوت متوقف بالفعل**');
            }
        }
        
        // أمر تغيير الوقت
        else if (command === 'time') {
            if (args.length < 2) {
                await message.reply('❌ **استخدم: !time [رقم] [دقيقة/ثانية]**\nمثال: !time 15 دقيقة');
                return;
            }
            
            const value = parseInt(args[0]);
            const unit = args[1].toLowerCase();
            
            if (isNaN(value) || value < 5) {
                await message.reply('❌ **الرجاء إدخال رقم صحيح أكبر من 5**');
                return;
            }
            
            let newTime;
            if (unit.includes('دقيقة') || unit.includes('دقيقه') || unit === 'د') {
                newTime = value * 60 * 1000;
            } else if (unit.includes('ثانية') || unit.includes('ثانيه') || unit === 'ث') {
                newTime = value * 1000;
            } else {
                await message.reply('❌ **وحدة غير صحيحة. استخدم: دقيقة / ثانية**');
                return;
            }
            
            intervalTime = newTime;
            startInterval();
            
            const timeDisplay = unit.includes('ث') ? `${value} ثانية` : `${value} دقيقة`;
            await message.reply(`✅ **تم تغيير وقت التكرار إلى ${timeDisplay}**`);
        }
        
        // أمر تحديد كلمة
        else if (command === 'word') {
            if (args.length === 0 || args[0] === 'none') {
                triggerWord = null;
                await message.reply('✅ **تم إلغاء تحديد الكلمة. سيتم تخزين جميع الرسائل**');
            } else {
                triggerWord = args.join(' ');
                await message.reply(`✅ **تم تحديد الكلمة: "${triggerWord}"**\nسيتم تخزين الرسائل التي تحتوي على هذه الكلمة فقط`);
            }
        }
        
        // أمر عرض الحالة
        else if (command === 'status') {
            const totalOrders = Array.from(userLastOrders.values()).reduce((acc, orders) => acc + orders.length, 0);
            const uniqueUsers = userLastOrders.size;
            
            const statusMsg = `
**📊 حالة البوت:**

🟢 **الحالة:** ${botActive ? 'نشط' : 'متوقف'}
⏱️ **وقت التكرار:** ${intervalTime/60000} دقيقة
🔤 **الكلمة المحددة:** ${triggerWord || 'جميع الرسائل'}
📝 **إجمالي الأوامر المخزنة:** ${totalOrders}
👥 **عدد المستخدمين:** ${uniqueUsers}
📢 **روم الطلبات:** <#${ORDERS_CHANNEL_ID}>
⚙️ **روم الأوامر:** <#${COMMANDS_CHANNEL_ID}>
🌐 **حالة الخادم:** متصل
`;
            await message.reply(statusMsg);
        }
        
        // أمر مسح الأوامر
        else if (command === 'clear') {
            userLastOrders.clear();
            await message.reply('🧹 **تم مسح جميع الأوامر المخزنة**');
        }
        
        // أمر عرض آخر الأوامر
        else if (command === 'list') {
            if (userLastOrders.size === 0) {
                await message.reply('📭 **لا توجد أوامر مخزنة**');
                return;
            }
            
            let listMsg = '**📋 آخر 10 أوامر:**\n\n';
            const allOrders = [];
            
            userLastOrders.forEach((orders, userId) => {
                orders.forEach(order => {
                    allOrders.push(order);
                });
            });
            
            allOrders.sort((a, b) => b.timestamp - a.timestamp);
            const recentOrders = allOrders.slice(0, 10);
            
            recentOrders.forEach(order => {
                const time = new Date(order.timestamp).toLocaleTimeString('ar-EG');
                listMsg += `**[${time}] ${order.authorTag}:** ${order.content}\n`;
            });
            
            await message.reply(listMsg);
        }
        
        // أمر اختبار
        else if (command === 'test') {
            await message.reply('✅ **البوت يعمل بشكل طبيعي!**');
        }
        
        // أمر غير معروف
        else {
            await message.reply(`❌ أمر غير معروف. استخدم \`!help\` لعرض الأوامر المتاحة`);
        }
        
    } catch (error) {
        console.error('❌ خطأ في تنفيذ الأمر:', error);
        await message.reply('❌ حدث خطأ في تنفيذ الأمر').catch(e => console.log('فشل إرسال رسالة الخطأ'));
    }
}

// دالة إعادة إرسال الأوامر
async function resendOrders() {
    try {
        const channel = await client.channels.fetch(ORDERS_CHANNEL_ID);
        if (!channel) return;
        
        const now = Date.now();
        const timeAgo = now - intervalTime;
        
        // تجميع جميع الأوامر من آخر فترة
        let ordersToResend = [];
        
        userLastOrders.forEach((orders, userId) => {
            const recentOrders = orders.filter(order => order.timestamp >= timeAgo);
            ordersToResend = ordersToResend.concat(recentOrders);
        });
        
        ordersToResend.sort((a, b) => a.timestamp - b.timestamp);
        
        if (ordersToResend.length === 0) {
            console.log('⏳ لا توجد أوامر جديدة لإعادة إرسالها');
            return;
        }
        
        // إنشاء رسالة موحدة
        let messageContent = `🔄 **إعادة إرسال أوامر آخر ${intervalTime/60000} دقيقة**\n`;
        if (triggerWord) messageContent += `🔤 **الكلمة المحددة:** ${triggerWord}\n`;
        messageContent += '\n';
        
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

process.on('unhandledRejection', error => {
    console.error('❌ خطأ غير معالج:', error);
});

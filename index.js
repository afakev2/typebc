const { Client } = require('discord.js-selfbot-v13');
const express = require('express');

// إعداد خادم HTTP
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        bot: 'Discord Self Bot'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        botConnected: client?.isReady() || false,
        uptime: process.uptime()
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP server running on port ${PORT}`);
});

// معالجة إغلاق الخادم
process.on('SIGTERM', () => {
    console.log('📥 SIGTERM received, closing gracefully...');
    server.close(() => {
        console.log('🛑 HTTP server closed');
        process.exit(0);
    });
});

// متغيرات البيئة
const TOKEN = process.env.DISCORD_TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const ORDERS_CHANNEL_ID = process.env.ORDERS_CHANNEL_ID;
const COMMANDS_CHANNEL_ID = process.env.COMMANDS_CHANNEL_ID || ORDERS_CHANNEL_ID;

// التحقق من المتغيرات
if (!TOKEN || !SERVER_ID || !ORDERS_CHANNEL_ID) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const client = new Client({
    checkUpdate: false,
    readyStatus: 'dnd'
});

// تخزين البيانات
const userLastOrders = new Map();
let botActive = true;
let intervalTime = 30 * 60 * 1000; // 30 دقيقة
let checkInterval = null;
let triggerWord = null;

client.on('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📋 Server ID: ${SERVER_ID}`);
    console.log(`📢 Orders Channel: ${ORDERS_CHANNEL_ID}`);
    
    startInterval();
});

function startInterval() {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(async () => {
        if (botActive) {
            try {
                await resendOrders();
            } catch (error) {
                console.error('❌ Error in interval:', error);
            }
        }
    }, intervalTime);
    console.log(`⏱️ Interval set to ${intervalTime/60000} minutes`);
}

function checkTriggerWord(content) {
    if (!triggerWord) return true;
    return content.toLowerCase().includes(triggerWord.toLowerCase());
}

client.on('messageCreate', async (message) => {
    try {
        if (message.author.id === client.user.id) return;
        if (message.guild?.id !== SERVER_ID) return;
        
        if (message.channel.id === COMMANDS_CHANNEL_ID && message.content.startsWith('!')) {
            await handleCommand(message);
            return;
        }
        
        if (message.channel.id === ORDERS_CHANNEL_ID && botActive) {
            if (!checkTriggerWord(message.content)) return;
            
            const userOrders = userLastOrders.get(message.author.id) || [];
            userOrders.push({
                content: message.content,
                timestamp: Date.now(),
                authorId: message.author.id,
                authorTag: message.author.tag
            });
            
            if (userOrders.length > 20) userOrders.shift();
            userLastOrders.set(message.author.id, userOrders);
            console.log(`📝 New order from ${message.author.tag}`);
        }
    } catch (error) {
        console.error('❌ Error in message handler:', error);
    }
});

async function handleCommand(message) {
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    const commands = {
        help: () => {
            const helpMsg = `
**📋 Commands:**

🟢 **!start** - Start bot
🔴 **!stop** - Stop bot
⏱️ **!time [number] [min/sec]** - Change interval
   Example: !time 15 min
   Example: !time 30 sec

🔤 **!word [word]** - Set trigger word
   Example: !word pizza
   Example: !word none - Remove trigger

📊 **!status** - Bot status
🧹 **!clear** - Clear stored orders
📋 **!list** - Show last 10 orders

⚡ **Current time:** ${intervalTime/60000} min
🔘 **Status:** ${botActive ? '🟢 Active' : '🔴 Stopped'}
🔤 **Trigger word:** ${triggerWord || 'none'}
`;
            return message.reply(helpMsg);
        },
        
        start: () => {
            if (!botActive) {
                botActive = true;
                return message.reply('✅ **Bot started**');
            }
            return message.reply('⚠️ **Bot already running**');
        },
        
        stop: () => {
            if (botActive) {
                botActive = false;
                return message.reply('⏸️ **Bot stopped**');
            }
            return message.reply('⚠️ **Bot already stopped**');
        },
        
        time: () => {
            if (args.length < 2) {
                return message.reply('❌ **Usage: !time [number] [min/sec]**');
            }
            
            const value = parseInt(args[0]);
            const unit = args[1].toLowerCase();
            
            if (isNaN(value) || value < 5) {
                return message.reply('❌ **Number must be greater than 5**');
            }
            
            let newTime;
            if (unit.startsWith('min')) {
                newTime = value * 60 * 1000;
            } else if (unit.startsWith('sec')) {
                newTime = value * 1000;
            } else {
                return message.reply('❌ **Use: min or sec**');
            }
            
            intervalTime = newTime;
            startInterval();
            return message.reply(`✅ **Interval changed to ${value} ${unit}**`);
        },
        
        word: () => {
            if (!args.length || args[0] === 'none') {
                triggerWord = null;
                return message.reply('✅ **Trigger word removed - all messages accepted**');
            }
            triggerWord = args.join(' ');
            return message.reply(`✅ **Trigger word set to: "${triggerWord}"**`);
        },
        
        status: () => {
            const totalOrders = Array.from(userLastOrders.values()).reduce((acc, orders) => acc + orders.length, 0);
            const uniqueUsers = userLastOrders.size;
            
            const statusMsg = `
**📊 Bot Status:**

🟢 **Status:** ${botActive ? 'Active' : 'Stopped'}
⏱️ **Interval:** ${intervalTime/60000} min
🔤 **Trigger word:** ${triggerWord || 'all messages'}
📝 **Total orders:** ${totalOrders}
👥 **Users:** ${uniqueUsers}
🌐 **HTTP:** Running on port ${PORT}
`;
            return message.reply(statusMsg);
        },
        
        clear: () => {
            userLastOrders.clear();
            return message.reply('🧹 **All orders cleared**');
        },
        
        list: () => {
            if (userLastOrders.size === 0) {
                return message.reply('📭 **No orders stored**');
            }
            
            let listMsg = '**📋 Last 10 orders:**\n\n';
            const allOrders = [];
            
            userLastOrders.forEach(orders => {
                orders.forEach(order => allOrders.push(order));
            });
            
            allOrders.sort((a, b) => b.timestamp - a.timestamp);
            const recentOrders = allOrders.slice(0, 10);
            
            recentOrders.forEach(order => {
                const time = new Date(order.timestamp).toLocaleTimeString();
                listMsg += `**[${time}] ${order.authorTag}:** ${order.content}\n`;
            });
            
            return message.reply(listMsg);
        }
    };
    
    if (commands[command]) {
        await commands[command]();
    }
}

async function resendOrders() {
    const channel = await client.channels.fetch(ORDERS_CHANNEL_ID);
    if (!channel) return;
    
    const now = Date.now();
    const timeAgo = now - intervalTime;
    
    let ordersToResend = [];
    userLastOrders.forEach(orders => {
        const recent = orders.filter(o => o.timestamp >= timeAgo);
        ordersToResend = ordersToResend.concat(recent);
    });
    
    ordersToResend.sort((a, b) => a.timestamp - b.timestamp);
    
    if (!ordersToResend.length) {
        console.log('⏳ No new orders');
        return;
    }
    
    let content = `🔄 **Orders from last ${intervalTime/60000} min**\n`;
    if (triggerWord) content += `🔤 **Trigger:** ${triggerWord}\n`;
    content += '\n';
    
    ordersToResend.forEach(order => {
        const time = new Date(order.timestamp).toLocaleTimeString();
        content += `**[${time}] ${order.authorTag}:** ${order.content}\n`;
    });
    
    if (content.length > 2000) {
        const chunks = content.match(/.{1,1900}/g) || [];
        for (const chunk of chunks) await channel.send(chunk);
    } else {
        await channel.send(content);
    }
    
    console.log(`✅ Resent ${ordersToResend.length} orders`);
}

// تسجيل الدخول مع إعادة المحاولة
async function loginWithRetry(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await client.login(TOKEN);
            console.log('✅ Discord client logged in');
            return;
        } catch (error) {
            console.error(`❌ Login attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
                console.log('⏳ Retrying in 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    console.error('❌ All login attempts failed');
    process.exit(1);
}

loginWithRetry();

// معالجة الأخطاء
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});

process.on('SIGINT', () => {
    console.log('📥 SIGINT received, closing...');
    if (checkInterval) clearInterval(checkInterval);
    client.destroy();
    server.close();
    process.exit(0);
});

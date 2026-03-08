// config.js - ملف الإعدادات الرئيسي
module.exports = {
    // الكلمة التي يرسلها البوت
    BOT_WORD: "-كت",
    
    // وقت التكرار بالثواني (600 ثانية = 10 دقائق)
    RESEND_TIME_SECONDS: 600,
    
    // نظام التشغيل التلقائي (ايقاف وتشغيل تلقائي)
    AUTO_STOP: {
        ENABLED: true,                    // شغّل النظام
        WORK_TIME_MINUTES: 60,             // وقت العمل (بالدقائق)
        REST_TIME_MINUTES: 80,              // وقت الراحة (بالدقائق)
    },
    
    // إعدادات السيرفر والروم
    DEFAULT_SERVER_ID: "",
    DEFAULT_CHANNEL_ID: ""
};

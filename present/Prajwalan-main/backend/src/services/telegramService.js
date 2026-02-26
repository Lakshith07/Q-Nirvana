const https = require('https');

const sendTelegramMessage = async (chatId, message) => {
    if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) {
        console.log('📱 Telegram not configured, skipping:', message);
        return { success: false, reason: 'not_configured' };
    }
    return new Promise((resolve) => {
        const text = encodeURIComponent(message);
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${text}&parse_mode=HTML`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ success: parsed.ok, data: parsed });
                } catch {
                    resolve({ success: false });
                }
            });
        }).on('error', (err) => {
            console.error('Telegram error:', err.message);
            resolve({ success: false, error: err.message });
        });
    });
};

const telegramMessages = {
    queueAlert2Ahead: (name, doctorName) =>
        `🏥 <b>Q Nirvana Alert</b>\nHi ${name}, only <b>2 patients</b> are ahead of you!\nDr. ${doctorName} will call you soon.\nPlease be ready at the OPD waiting area. 🙏`,

    appointmentReminder: (name, time) =>
        `⏰ <b>Appointment Reminder</b>\nHi ${name}, your appointment is in <b>30 minutes</b> at ${time}.\nPlease head to the OPD counter now.`,

    emergencyAccepted: (driverName, vehicleNumber) =>
        `🚨 <b>Emergency Ambulance Dispatched</b>\nDriver: ${driverName}\nVehicle: ${vehicleNumber}\nHelp is on the way! Stay calm.`,

    bloodRequestApproved: (name, bloodGroup, units) =>
        `🩸 <b>Blood Request Approved</b>\nDear ${name}, your request for <b>${units} units of ${bloodGroup}</b> blood has been approved.`,

    bedAllocated: (name, ward, room, bed) =>
        `🛏️ <b>Bed Allocated</b>\nDear ${name}, Bed <b>${bed}</b> in Room ${room}, Ward ${ward} has been assigned to you.`,
};

module.exports = { sendTelegramMessage, telegramMessages };

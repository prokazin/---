// ===== api/check-alerts.js — проверка алертов + напоминаний календаря =====
// Вызывается через cron-job.org каждые 5 минут

const KV_URL = process.env.KV_REST_API_URL || process.env.STORAGE_URL || process.env.STORAGE_KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.STORAGE_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN;
const BOT_TOKEN = '8381752054:AAH6PbcijT-hDcgPn8iO_DPu1bwTO1Z5d08';
const MINI_APP_URL = 'https://crypto-nine-opal.vercel.app/';

async function kvGet(key) {
    const r = await fetch(`${KV_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
        cache: 'no-store'
    });
    const d = await r.json();
    return d.result;
}

async function kvSet(key, value) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    const r = await fetch(`${KV_URL}/set/${key}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${KV_TOKEN}`,
            'Content-Type': 'text/plain'
        },
        body: str
    });
    return r.ok;
}

module.exports = async function handler(req, res) {
    const secret = req.query.secret;
    if (secret !== 'coindigest_2026') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!KV_URL || !KV_TOKEN) {
        return res.status(500).json({ error: 'KV not configured' });
    }

    try {
        const alertsResult = await checkAlerts();
        const remindersResult = await checkCalendarReminders();

        return res.status(200).json({
            success: true,
            alerts: alertsResult,
            reminders: remindersResult,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('check-alerts error:', e);
        return res.status(500).json({ error: e.message });
    }
};

// ============================================
// === ПРОВЕРКА ЦЕНОВЫХ АЛЕРТОВ ===
// ============================================

async function checkAlerts() {
    const alertsRaw = await kvGet('all_alerts');
    const alerts = alertsRaw ? JSON.parse(alertsRaw) : [];

    if (!alerts.length) return { checked: 0, notified: 0 };

    const coinIds = [...new Set(alerts.map(a => a.coinId).filter(Boolean))];
    if (!coinIds.length) return { checked: 0, notified: 0 };

    const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`;
    const priceRes = await fetch(priceUrl);
    const prices = priceRes.ok ? await priceRes.json() : {};

    let notifiedCount = 0;
    let changed = false;

    for (const alert of alerts) {
        const priceData = prices[alert.coinId];
        if (!priceData || !priceData.usd) continue;

        const current = priceData.usd;
        const target = alert.price;
        alert.lastCheck = new Date().toISOString();

        const shouldFire = alert.condition === 'above' ? current >= target : current <= target;

        if (shouldFire && !alert.notified) {
            const arrow = alert.condition === 'above' ? '🟢' : '🔴';
            const direction = alert.condition === 'above' ? 'вырос до' : 'упал до';
            const targetText = alert.condition === 'above' ? `выше $${target}` : `ниже $${target}`;

            const msg =
                `${arrow} *Алерт сработал*\n\n` +
                `*${alert.symbol}* ${direction} *$${current.toFixed(2)}*\n` +
                `Цель: ${targetText}\n\n` +
                `[📱 Открыть Mini App](${MINI_APP_URL})`;

            try {
                const botRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: alert.userId,
                        text: msg,
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true,
                    })
                });
                const botData = await botRes.json();
                if (botData.ok) {
                    alert.notified = true;
                    notifiedCount++;
                    changed = true;
                }
            } catch (e) {
                console.error(`Ошибка уведомления ${alert.id}:`, e.message);
            }
        }

        if (!shouldFire && alert.notified) {
            alert.notified = false;
            changed = true;
        }
    }

    if (changed) await kvSet('all_alerts', JSON.stringify(alerts));

    return { checked: alerts.length, notified: notifiedCount };
}

// ============================================
// === ПРОВЕРКА НАПОМИНАНИЙ КАЛЕНДАРЯ ===
// ============================================

async function checkCalendarReminders() {
    const remindersRaw = await kvGet('calendar_reminders');
    const reminders = remindersRaw ? JSON.parse(remindersRaw) : [];

    if (!reminders.length) return { checked: 0, notified24h: 0, notified1h: 0 };

    const now = Date.now();
    const H24 = 24 * 60 * 60 * 1000;
    const H1 = 60 * 60 * 1000;

    let notified24h = 0;
    let notified1h = 0;
    let changed = false;

    for (const r of reminders) {
        const eventTime = new Date(r.eventDate).getTime();
        if (isNaN(eventTime)) continue;

        const diff = eventTime - now;

        // За 24 часа
        if (diff > 0 && diff <= H24 && !r.notified24h) {
            const msg =
                `🔔 *Напоминание о событии*\n\n` +
                `*${r.eventName}*\n` +
                `${r.eventType ? `Тип: ${r.eventType}\n` : ''}` +
                `🗓 Когда: ${new Date(r.eventDate).toLocaleString('ru-RU')}\n` +
                `⏱ Осталось: ${Math.round(diff / H24 * 24)} ч\n\n` +
                `[📱 Подробнее в Mini App](${MINI_APP_URL})`;

            const ok = await sendToUser(r.userId, msg);
            if (ok) {
                r.notified24h = true;
                notified24h++;
                changed = true;
            }
        }

        // За 1 час
        if (diff > 0 && diff <= H1 && !r.notified1h) {
            const msg =
                `⚡️ *Скоро событие*\n\n` +
                `*${r.eventName}*\n` +
                `🗓 Через ~${Math.round(diff / 60000)} мин\n\n` +
                `[📱 Открыть Mini App](${MINI_APP_URL})`;

            const ok = await sendToUser(r.userId, msg);
            if (ok) {
                r.notified1h = true;
                notified1h++;
                changed = true;
            }
        }
    }

    // Чистим старые (которые уже прошли)
    const before = reminders.length;
    const filtered = reminders.filter(r => {
        const t = new Date(r.eventDate).getTime();
        return isNaN(t) || t > now;
    });
    if (filtered.length !== before) changed = true;

    if (changed) await kvSet('calendar_reminders', JSON.stringify(filtered));

    return { checked: filtered.length, notified24h, notified1h };
}

async function sendToUser(userId, msg) {
    try {
        const botRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: userId,
                text: msg,
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
            })
        });
        const botData = await botRes.json();
        return botData.ok === true;
    } catch (e) {
        return false;
    }
}

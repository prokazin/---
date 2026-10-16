// ===== api/alerts.js — управление алертами через Vercel KV =====
// POST   /api/alerts?secret=... — создать
// GET    /api/alerts?secret=...&userId=... — получить список
// DELETE /api/alerts?secret=...&userId=...&alertId=... — удалить

// Универсально определяем переменные KV (с любым prefix)
const KV_URL = process.env.KV_REST_API_URL || process.env.STORAGE_URL || process.env.STORAGE_KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.STORAGE_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN;

// ⚠️ ЗАМЕНИТЕ НА ВАШ ТОКЕН
const BOT_TOKEN = '8381752054:AAH6PbcijT-hDcgPn8iO_DPu1bwTO1Z5d08';

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const secret = req.query.secret || (req.body && req.body.secret);
    if (secret !== 'coindigest_2026') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!KV_URL || !KV_TOKEN) {
        return res.status(500).json({ error: 'KV not configured', KV_URL: !!KV_URL, KV_TOKEN: !!KV_TOKEN });
    }

    try {
        // ===== СОЗДАНИЕ =====
        if (req.method === 'POST') {
            const { userId, username, coinId, symbol, name, condition, price } = req.body || {};
            if (!userId || !coinId || !condition || !price) {
                return res.status(400).json({ error: 'Missing fields' });
            }
            if (!['above', 'below'].includes(condition)) {
                return res.status(400).json({ error: 'Bad condition' });
            }

            const alertsRaw = await kvGet('all_alerts');
            let alerts = alertsRaw ? JSON.parse(alertsRaw) : [];

            const userAlerts = alerts.filter(a => a.userId === String(userId));
            if (userAlerts.length >= 20) {
                return res.status(400).json({ error: 'Лимит: 20 алертов' });
            }

            const newAlert = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                userId: String(userId),
                username: username || '',
                coinId,
                symbol: (symbol || '').toUpperCase(),
                name: name || '',
                condition,
                price: parseFloat(price),
                createdAt: new Date().toISOString(),
                notified: false,
                lastCheck: null,
            };

            alerts.push(newAlert);
            await kvSet('all_alerts', JSON.stringify(alerts));

            // Отправляем приветственное сообщение в личку
            let botOk = false;
            try {
                const botRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: userId,
                        text: `✅ *Алерт активирован*\n\n${symbol.toUpperCase()} — цена ${condition === 'above' ? 'выше' : 'ниже'} $${price}\n\nМы пришлём уведомление, как только условие сработает.`,
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true
                    })
                });
                const botData = await botRes.json();
                botOk = botData.ok === true;
            } catch (e) {}

            return res.status(200).json({
                success: true,
                alert: newAlert,
                botNotified: botOk,
                hint: botOk ? null : 'Напишите боту /start, чтобы получать уведомления'
            });
        }

        // ===== УДАЛЕНИЕ =====
        if (req.method === 'DELETE') {
            const { userId, alertId } = req.query;
            if (!userId || !alertId) return res.status(400).json({ error: 'Missing' });

            const alertsRaw = await kvGet('all_alerts');
            let alerts = alertsRaw ? JSON.parse(alertsRaw) : [];
            const before = alerts.length;
            alerts = alerts.filter(a => !(a.id === alertId && a.userId === String(userId)));
            await kvSet('all_alerts', JSON.stringify(alerts));

            return res.status(200).json({ success: true, removed: before - alerts.length });
        }

        // ===== ПОЛУЧЕНИЕ СПИСКА =====
        if (req.method === 'GET') {
            const userId = req.query.userId;
            if (!userId) return res.status(400).json({ error: 'No userId' });

            const alertsRaw = await kvGet('all_alerts');
            const alerts = alertsRaw ? JSON.parse(alertsRaw) : [];
            const userAlerts = alerts.filter(a => a.userId === String(userId));

            return res.status(200).json({ success: true, alerts: userAlerts });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('alerts error:', e);
        return res.status(500).json({ error: e.message });
    }
};

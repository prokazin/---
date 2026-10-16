// ===== api/calendar-reminders.js — напоминания о событиях календаря =====
// POST   /api/calendar-reminders?secret=... — создать напоминание
// GET    /api/calendar-reminders?secret=...&userId=... — список
// DELETE /api/calendar-reminders?secret=...&userId=...&reminderId=... — удалить

const KV_URL = process.env.KV_REST_API_URL || process.env.STORAGE_URL || process.env.STORAGE_KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.STORAGE_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN;

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
        return res.status(500).json({ error: 'KV not configured' });
    }

    try {
        // ===== СОЗДАНИЕ =====
        if (req.method === 'POST') {
            const { userId, eventName, eventDate, eventType } = req.body || {};
            if (!userId || !eventName || !eventDate) {
                return res.status(400).json({ error: 'Missing fields' });
            }

            const remindersRaw = await kvGet('calendar_reminders');
            let reminders = remindersRaw ? JSON.parse(remindersRaw) : [];

            // Проверка на дубликат
            const exists = reminders.find(r =>
                r.userId === String(userId) && r.eventName === eventName
            );
            if (exists) {
                return res.status(200).json({ success: true, reminder: exists, alreadyExists: true });
            }

            const newReminder = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                userId: String(userId),
                eventName,
                eventDate,
                eventType: eventType || '',
                createdAt: new Date().toISOString(),
                notified24h: false,   // отправлено ли за 24ч
                notified1h: false,    // отправлено ли за 1ч
            };

            reminders.push(newReminder);
            await kvSet('calendar_reminders', JSON.stringify(reminders));

            return res.status(200).json({ success: true, reminder: newReminder });
        }

        // ===== УДАЛЕНИЕ =====
        if (req.method === 'DELETE') {
            const { userId, reminderId, eventName } = req.query;
            if (!userId) return res.status(400).json({ error: 'No userId' });

            const remindersRaw = await kvGet('calendar_reminders');
            let reminders = remindersRaw ? JSON.parse(remindersRaw) : [];
            const before = reminders.length;

            if (reminderId) {
                reminders = reminders.filter(r => !(r.id === reminderId && r.userId === String(userId)));
            } else if (eventName) {
                reminders = reminders.filter(r => !(r.eventName === eventName && r.userId === String(userId)));
            }

            await kvSet('calendar_reminders', JSON.stringify(reminders));

            return res.status(200).json({ success: true, removed: before - reminders.length });
        }

        // ===== ПОЛУЧЕНИЕ =====
        if (req.method === 'GET') {
            const userId = req.query.userId;
            if (!userId) return res.status(400).json({ error: 'No userId' });

            const remindersRaw = await kvGet('calendar_reminders');
            const reminders = remindersRaw ? JSON.parse(remindersRaw) : [];
            const userReminders = reminders.filter(r => r.userId === String(userId));

            return res.status(200).json({ success: true, reminders: userReminders });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('calendar-reminders error:', e);
        return res.status(500).json({ error: e.message });
    }
};

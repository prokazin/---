// ===== api/ai.js — прокси к Groq API =====

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const secret = req.query.secret || (req.body && req.body.secret);
    if (secret !== 'coindigest_2026') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // ⚠️ ЗАМЕНИТЕ на ваш ключ Groq
    const GROQ_KEY = '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';

    const q = (req.query.q || '').toString().slice(0, 800);
    if (!q) return res.status(400).json({ error: 'No query' });

    const prompt = `Ты крипто-аналитик. По этим новостям напиши вывод в 2-3 предложениях: что это значит для рынка криптовалют. Без вступлений, без приветствий, только сам вывод на русском языке:\n\n${q}`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.6
            })
        });

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        return res.status(200).json({ success: true, text });
    } catch (error) {
        console.error('Groq error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

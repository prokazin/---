// ===== api/news.js — Vercel Serverless Function =====
// Запуск по расписанию каждые 30 минут

export default async function handler(req, res) {
    // Проверяем, что запрос от Vercel Cron
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Собираем новости
        const news = await fetchNews();
        
        // 2. Отправляем в Telegram
        const result = await sendToTelegram(news);
        
        return res.status(200).json({ 
            success: true, 
            newsCount: news.length,
            telegramResult: result 
        });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return res.status(500).json({ error: error.message });
    }
}

// === ИСТОЧНИКИ НОВОСТЕЙ ===
const NEWS_SOURCES = [
    {
        name: 'CoinDesk',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/feed'
    },
    {
        name: 'Cointelegraph',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/feed'
    },
    {
        name: 'CryptoPotato',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cryptopotato.com/feed'
    },
    {
        name: 'Bitcoin.com',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://news.bitcoin.com/feed'
    }
];

// === ФУНКЦИИ ===
async function fetchNews() {
    let allNews = [];
    
    for (const source of NEWS_SOURCES) {
        try {
            const response = await fetch(source.url);
            if (!response.ok) continue;
            
            const data = await response.json();
            if (data && data.items) {
                const items = data.items.slice(0, 3).map(item => ({
                    title: item.title,
                    url: item.link,
                    source: source.name,
                    published_at: item.pubDate || new Date().toISOString()
                }));
                allNews = allNews.concat(items);
            }
        } catch (e) {
            console.error(`Ошибка ${source.name}:`, e.message);
        }
    }
    
    return allNews;
}

async function sendToTelegram(newsItems) {
    const BOT_TOKEN = '8422981212:AAFqUt5juqdC_l64q7FACOBw-mFL4f0hN8Y';
    const CHAT_ID = '-1004345602790';
    
    if (!newsItems || newsItems.length === 0) {
        return { sent: false, reason: 'Нет новостей' };
    }
    
    // Берём первые 5 новостей
    const toSend = newsItems.slice(0, 5);
    
    let message = '📰 *CoinDigest — Свежие новости*\n\n';
    toSend.forEach((item, index) => {
        message += `${index + 1}. [${item.title}](${item.url})\n`;
        message += `   📌 ${item.source}\n\n`;
    });
    message += `\n🔄 Обновлено: ${new Date().toLocaleString('ru-RU')}`;
    message += `\n🔗 Читать все: https://coindigestonline.ru/`;
    
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            })
        });
        
        const result = await response.json();
        return { sent: result.ok, result: result };
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        return { sent: false, error: error.message };
    }
}

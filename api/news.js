// ===== api/news.js — Vercel Serverless Function =====
// Вызывается через cron-job.org или вручную

export default async function handler(req, res) {
    // Разрешаем GET и POST запросы
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Защита от случайных запросов (секретный ключ)
    const secret = req.query.secret || req.body?.secret;
    if (secret !== 'coindigest_2026') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('📡 Начинаем сбор новостей...');
        
        // 1. Собираем новости
        const news = await fetchNews();
        console.log(`📰 Собрано ${news.length} новостей`);
        
        // 2. Отправляем в Telegram
        const telegramResult = await sendToTelegram(news);
        
        // 3. Возвращаем результат
        return res.status(200).json({ 
            success: true, 
            newsCount: news.length,
            sent: telegramResult.sent,
            message: telegramResult.message || 'OK',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return res.status(500).json({ error: error.message });
    }
}

// === КОНФИГ ===
const BOT_TOKEN = '8422981212:AAFqUt5juqdC_l64q7FACOBw-mFL4f0hN8Y';
const CHAT_ID = '-1004345602790';

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
    },
    {
        name: 'Reddit Crypto',
        url: 'https://www.reddit.com/r/CryptoCurrency/.json?limit=5',
        parser: (data) => {
            if (!data || !data.data || !data.data.children) return [];
            return data.data.children.map(child => ({
                title: child.data.title,
                url: 'https://reddit.com' + child.data.permalink,
                source: 'Reddit r/CryptoCurrency',
                published_at: new Date(child.data.created_utc * 1000).toISOString()
            }));
        }
    }
];

// === ЗАГРУЗКА НОВОСТЕЙ ===
async function fetchNews() {
    let allNews = [];
    
    for (const source of NEWS_SOURCES) {
        try {
            const response = await fetch(source.url);
            if (!response.ok) {
                console.warn(`⚠️ ${source.name}: HTTP ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            let items = [];
            
            // Если есть специальный парсер — используем его
            if (source.parser) {
                items = source.parser(data);
            } else {
                // Стандартный парсер для RSS2JSON
                if (data && data.items) {
                    items = data.items.slice(0, 3).map(item => ({
                        title: item.title,
                        url: item.link,
                        source: source.name,
                        published_at: item.pubDate || new Date().toISOString()
                    }));
                }
            }
            
            allNews = allNews.concat(items);
            console.log(`✅ ${source.name}: загружено ${items.length} новостей`);
        } catch (e) {
            console.error(`❌ Ошибка ${source.name}:`, e.message);
        }
    }
    
    // Перемешиваем и берём первые 10
    allNews = shuffleArray(allNews);
    return allNews.slice(0, 10);
}

// === ПЕРЕМЕШИВАНИЕ ===
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// === ПЕРЕВОД НА РУССКИЙ (ОПЦИОНАЛЬНО) ===
async function translateToRussian(text) {
    if (!text) return 'Новость';
    if (/[а-яА-Я]/.test(text)) return text;
    
    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ru`
        );
        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
    } catch (e) {
        console.debug('Ошибка перевода:', e.message);
    }
    return text;
}

// === ОТПРАВКА В TELEGRAM ===
async function sendToTelegram(newsItems) {
    if (!newsItems || newsItems.length === 0) {
        return { sent: false, message: 'Нет новостей' };
    }
    
    // Берём первые 5 новостей
    const toSend = newsItems.slice(0, 5);
    
    let message = '📰 *CoinDigest — Свежие новости*\n\n';
    for (const item of toSend) {
        const title = await translateToRussian(item.title || 'Новость');
        const url = item.url || '#';
        message += `• [${title}](${url})\n`;
        message += `   📌 ${item.source || 'Unknown'}\n\n`;
    }
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
                disable_web_page_preview: true,
                disable_notification: false
            })
        });
        
        const result = await response.json();
        if (result.ok) {
            console.log(`✅ Отправлено ${toSend.length} новостей в Telegram`);
            return { sent: true, message: `Отправлено ${toSend.length} новостей` };
        } else {
            console.error('❌ Ошибка Telegram:', result.description);
            return { sent: false, message: result.description };
        }
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        return { sent: false, message: error.message };
    }
}

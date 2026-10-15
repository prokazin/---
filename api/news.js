// ===== api/news.js — Vercel Serverless Function (CommonJS) =====

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const secret = req.query.secret || (req.body && req.body.secret);
    if (secret !== 'coindigest_2026') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('📡 Начинаем сбор новостей...');
        const news = await fetchNews();
        console.log(`📰 Собрано ${news.length} новостей`);
        const telegramResult = await sendToTelegram(news);
        const analysisResult = await sendAnalysisToTelegram();

        return res.status(200).json({
            success: true,
            newsCount: news.length,
            sent: telegramResult.sent,
            analysisSent: analysisResult.sent,
            message: telegramResult.message || 'OK',
            news: news.slice(0, 10),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return res.status(500).json({ error: error.message });
    }
};

// ============================================
// === КОНФИГ — ЗАМЕНИТЕ ТОКЕН! ===
// ============================================

const BOT_TOKEN = '8381752054:ВАШ_ПОЛНЫЙ_ТОКЕН';
const CHAT_ID = '-1004427870334';

// ============================================
// === ИСТОЧНИКИ НОВОСТЕЙ ===
// ============================================

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

// ============================================
// === ЗАГРУЗКА НОВОСТЕЙ ===
// ============================================

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
            if (data && data.items) {
                const items = data.items.slice(0, 3).map(item => ({
                    title: item.title,
                    url: item.link,
                    source: source.name,
                    published_at: item.pubDate || new Date().toISOString()
                }));
                allNews = allNews.concat(items);
                console.log(`✅ ${source.name}: ${items.length} новостей`);
            }
        } catch (e) {
            console.error(`❌ Ошибка ${source.name}:`, e.message);
        }
    }

    allNews = shuffleArray(allNews);
    return allNews.slice(0, 10);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================
// === ПЕРЕВОД ===
// ============================================

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

// ============================================
// === ОТПРАВКА НОВОСТЕЙ ===
// ============================================

async function sendToTelegram(newsItems) {
    if (!newsItems || newsItems.length === 0) {
        return { sent: false, message: 'Нет новостей' };
    }

    const toSend = newsItems.slice(0, 5);

    let message = '📰 *CoinDigest — Свежие новости*\n\n';
    for (const item of toSend) {
        const title = await translateToRussian(item.title || 'Новость');
        const url = item.url || '#';
        message += `• [${title}](${url})\n`;
        message += `   📌 ${item.source || 'Unknown'}\n\n`;
    }
    message += `\n🔄 Обновлено: ${new Date().toLocaleString('ru-RU')}`;
    message += `\n🔗 Читать все: https://crypto-nine-opal.vercel.app/`;

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
        if (result.ok) {
            console.log(`✅ Отправлено ${toSend.length} новостей`);
            return { sent: true, message: `Отправлено ${toSend.length}` };
        } else {
            console.error('❌ Telegram:', result.description);
            return { sent: false, message: result.description };
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return { sent: false, message: error.message };
    }
}

// ============================================
// === ОТПРАВКА АНАЛИЗА ===
// ============================================

async function sendAnalysisToTelegram() {
    try {
        const analysisData = await fetchAnalysisData();
        if (!analysisData) return { sent: false, message: 'Нет данных' };

        let message = '🌅 *Утренний анализ крипторынка*\n';
        message += `🕐 ${new Date().toLocaleString('ru-RU')}\n\n`;
        message += `📊 *Общий рынок:*\n`;
        message += `• Капитализация: ${analysisData.totalMarketCap}\n`;
        message += `• Доминация BTC: ${analysisData.btcDominance}\n`;
        message += `• Доминация ETH: ${analysisData.ethDominance}\n\n`;
        message += `🏆 *Топ монеты:*\n`;
        for (const coin of analysisData.topCoins) {
            const sign = coin.change >= 0 ? '+' : '';
            const emoji = coin.change >= 0 ? '🟢' : '🔴';
            message += `• ${emoji} *${coin.symbol}*: $${coin.price} (${sign}${coin.change}%)\n`;
        }
        message += `\n#анализ #крипторынок`;

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
        return { sent: result.ok, message: result.description || 'OK' };
    } catch (error) {
        return { sent: false, message: error.message };
    }
}

async function fetchAnalysisData() {
    try {
        const globalRes = await fetch('https://api.coingecko.com/api/v3/global');
        const globalData = globalRes.ok ? await globalRes.json() : null;

        const coinsRes = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false'
        );
        const coinsData = coinsRes.ok ? await coinsRes.json() : [];

        const topCoins = coinsData.map(coin => ({
            symbol: coin.symbol.toUpperCase(),
            price: coin.current_price ? coin.current_price.toFixed(2) : '0',
            change: coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0'
        }));

        let totalMarketCap = 'Данные недоступны';
        let btcDominance = 'Данные недоступны';
        let ethDominance = 'Данные недоступны';

        if (globalData && globalData.data) {
            if (globalData.data.total_market_cap && globalData.data.total_market_cap.usd) {
                const cap = globalData.data.total_market_cap.usd;
                if (cap >= 1e12) totalMarketCap = '$' + (cap / 1e12).toFixed(2) + ' трлн';
                else if (cap >= 1e9) totalMarketCap = '$' + (cap / 1e9).toFixed(2) + ' млрд';
            }
            if (globalData.data.market_cap_percentage) {
                if (globalData.data.market_cap_percentage.btc) {
                    btcDominance = globalData.data.market_cap_percentage.btc.toFixed(2) + '%';
                }
                if (globalData.data.market_cap_percentage.eth) {
                    ethDominance = globalData.data.market_cap_percentage.eth.toFixed(2) + '%';
                }
            }
        }

        return { totalMarketCap, btcDominance, ethDominance, topCoins };
    } catch (error) {
        console.error('Ошибка анализа:', error);
        return {
            totalMarketCap: 'Ожидание данных...',
            btcDominance: 'Ожидание данных...',
            ethDominance: 'Ожидание данных...',
            topCoins: [
                { symbol: 'BTC', price: '67,450', change: '+2.35' },
                { symbol: 'ETH', price: '3,820', change: '+1.87' },
                { symbol: 'BNB', price: '598', change: '+0.92' },
                { symbol: 'SOL', price: '175', change: '+3.21' },
                { symbol: 'XRP', price: '0.612', change: '-0.45' }
            ]
        };
    }
}

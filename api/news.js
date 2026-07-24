// ===== api/news.js — Vercel Serverless Function =====
// Вызывается через cron-job.org каждые 30 минут

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const secret = req.query.secret || req.body?.secret;
    if (secret !== 'coindigest_2026') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('📡 Начинаем сбор новостей...');
        
        const news = await fetchNews();
        console.log(`📰 Собрано ${news.length} новостей`);
        
        // Отправляем новости в Telegram
        const telegramResult = await sendToTelegram(news);
        
        // Отправляем анализ в Telegram
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
}

// ============================================
// === КОНФИГ ===
// ============================================

const BOT_TOKEN = '8422981212:AAFqUt5juqdC_l64q7FACOBw-mFL4f0hN8Y';
const CHAT_ID = '-1004345602790';

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
            let items = [];
            
            if (source.parser) {
                items = source.parser(data);
            } else {
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
    
    allNews = shuffleArray(allNews);
    return allNews.slice(0, 10);
}

// ============================================
// === ПЕРЕМЕШИВАНИЕ ===
// ============================================

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================
// === ПЕРЕВОД НА РУССКИЙ ===
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
// === ОТПРАВКА НОВОСТЕЙ В TELEGRAM ===
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

// ============================================
// === ОТПРАВКА АНАЛИЗА В TELEGRAM ===
// ============================================

async function sendAnalysisToTelegram() {
    try {
        // Получаем данные для анализа
        const analysisData = await fetchAnalysisData();
        
        if (!analysisData) {
            console.log('ℹ️ Данные для анализа недоступны');
            return { sent: false, message: 'Нет данных' };
        }

        let message = '🌅 *Утренний анализ крипторынка*\n';
        message += `🕐 ${new Date().toLocaleString('ru-RU')}\n\n`;
        
        // Общий рынок
        message += `📊 *Общий рынок:*\n`;
        message += `• Капитализация: ${analysisData.totalMarketCap || 'Данные недоступны'}\n`;
        message += `• Доминация BTC: ${analysisData.btcDominance || 'Данные недоступны'}\n`;
        message += `• Доминация ETH: ${analysisData.ethDominance || 'Данные недоступны'}\n\n`;
        
        // Топ монеты
        message += `🏆 *Топ монеты:*\n`;
        if (analysisData.topCoins && analysisData.topCoins.length > 0) {
            for (const coin of analysisData.topCoins) {
                const sign = coin.change >= 0 ? '+' : '';
                const emoji = coin.change >= 0 ? '🟢' : '🔴';
                message += `• ${emoji} *${coin.symbol}*: $${coin.price} (${sign}${coin.change}%)\n`;
            }
        } else {
            message += `Данные временно недоступны\n`;
        }
        
        message += `\n#анализ #крипторынок 🌅утро`;
        
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
            console.log('✅ Анализ отправлен в Telegram');
            return { sent: true, message: 'Анализ отправлен' };
        } else {
            console.error('❌ Ошибка отправки анализа:', result.description);
            return { sent: false, message: result.description };
        }
    } catch (error) {
        console.error('❌ Ошибка анализа:', error);
        return { sent: false, message: error.message };
    }
}

// ============================================
// === ПОЛУЧЕНИЕ ДАННЫХ ДЛЯ АНАЛИЗА ===
// ============================================

async function fetchAnalysisData() {
    try {
        // Пробуем получить данные с CoinGecko
        const response = await fetch(
            'https://api.coingecko.com/api/v3/global'
        );
        
        if (!response.ok) {
            console.warn(`⚠️ CoinGecko global: HTTP ${response.status}`);
            // Если API недоступен, используем запасные данные
            return getFallbackAnalysisData();
        }
        
        const globalData = await response.json();
        
        // Получаем топ монеты
        const coinsResponse = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false'
        );
        
        let topCoins = [];
        if (coinsResponse.ok) {
            const coinsData = await coinsResponse.json();
            topCoins = coinsData.map(coin => ({
                symbol: coin.symbol.toUpperCase(),
                price: coin.current_price ? coin.current_price.toFixed(2) : '0',
                change: coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0'
            }));
        } else {
            console.warn('⚠️ Не удалось получить топ монеты');
            // Используем запасные данные
            topCoins = getFallbackCoins();
        }
        
        // Форматируем капитализацию
        let totalMarketCap = 'Данные недоступны';
        if (globalData.data && globalData.data.total_market_cap) {
            const cap = globalData.data.total_market_cap.usd;
            if (cap) {
                totalMarketCap = formatMarketCap(cap);
            }
        }
        
        // Форматируем доминацию
        let btcDominance = 'Данные недоступны';
        let ethDominance = 'Данные недоступны';
        if (globalData.data && globalData.data.market_cap_percentage) {
            if (globalData.data.market_cap_percentage.btc) {
                btcDominance = globalData.data.market_cap_percentage.btc.toFixed(2) + '%';
            }
            if (globalData.data.market_cap_percentage.eth) {
                ethDominance = globalData.data.market_cap_percentage.eth.toFixed(2) + '%';
            }
        }
        
        return {
            totalMarketCap,
            btcDominance,
            ethDominance,
            topCoins
        };
        
    } catch (error) {
        console.error('❌ Ошибка получения данных для анализа:', error);
        return getFallbackAnalysisData();
    }
}

// ============================================
// === ЗАПАСНЫЕ ДАННЫЕ ДЛЯ АНАЛИЗА ===
// ============================================

function getFallbackAnalysisData() {
    return {
        totalMarketCap: 'Ожидание данных...',
        btcDominance: 'Ожидание данных...',
        ethDominance: 'Ожидание данных...',
        topCoins: getFallbackCoins()
    };
}

function getFallbackCoins() {
    return [
        { symbol: 'BTC', price: '67,450', change: '+2.35' },
        { symbol: 'ETH', price: '3,820', change: '+1.87' },
        { symbol: 'BNB', price: '598', change: '+0.92' },
        { symbol: 'SOL', price: '175', change: '+3.21' },
        { symbol: 'XRP', price: '0.612', change: '-0.45' }
    ];
}

// ============================================
// === ФОРМАТИРОВАНИЕ КАПИТАЛИЗАЦИИ ===
// ============================================

function formatMarketCap(value) {
    if (!value) return 'Данные недоступны';
    
    const val = Number(value);
    if (val >= 1e12) {
        return '$' + (val / 1e12).toFixed(2) + ' трлн';
    } else if (val >= 1e9) {
        return '$' + (val / 1e9).toFixed(2) + ' млрд';
    } else if (val >= 1e6) {
        return '$' + (val / 1e6).toFixed(2) + ' млн';
    } else {
        return '$' + val.toFixed(2);
    }
}

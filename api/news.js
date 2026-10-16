// ===== api/news.js — Vercel Serverless Function (CommonJS) =====
// Режимы: morning | analytics | evening | list

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const secret = req.query.secret || (req.body && req.body.secret);
    if (secret !== 'coindigest_2026') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const mode = (req.query.mode || 'morning').toLowerCase();

    try {
        console.log(`Режим: ${mode}`);

        if (mode === 'list') {
            const news = await fetchNews(15);
            const translated = await translateList(news);
            return res.status(200).json({ success: true, news: translated });
        }

        let result;
        if (mode === 'analytics') result = await sendAnalytics();
        else if (mode === 'evening') result = await sendEvening();
        else result = await sendMorning();

        return res.status(200).json({
            success: true,
            mode,
            sent: result.sent,
            message: result.message,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка:', error);
        return res.status(500).json({ error: error.message });
    }
};

// ============================================
// === КОНФИГ — ЗАМЕНИТЕ ТОКЕН ===
// ============================================

// ⚠️ ЗАМЕНИТЕ НА ВАШ ТОКЕН
const BOT_TOKEN = '8381752054:AAH6PbcijT-hDcgPn8iO_DPu1bwTO1Z5d08';
const CHAT_ID = '-1004427870334';
const MINI_APP_URL = 'https://crypto-nine-opal.vercel.app/';

// ============================================
// === ИСТОЧНИКИ ===
// ============================================

const NEWS_SOURCES = [
    { name: 'CoinDesk', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/feed' },
    { name: 'Cointelegraph', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/feed' },
    { name: 'CryptoPotato', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cryptopotato.com/feed' },
    { name: 'Bitcoin.com', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://news.bitcoin.com/feed' }
];

// ============================================
// === ПЕРЕВОД СПИСКА (ПАРАЛЛЕЛЬНО) ===
// ============================================

async function translateList(news) {
    const results = [];
    const chunks = [];
    for (let i = 0; i < news.length; i += 5) {
        chunks.push(news.slice(i, i + 5));
    }

    for (const chunk of chunks) {
        const translated = await Promise.allSettled(
            chunk.map(async (item) => {
                const title = await translateToRussian(item.title);
                return { ...item, title };
            })
        );
        translated.forEach(r => {
            if (r.status === 'fulfilled') results.push(r.value);
        });
    }
    return results;
}

// ============================================
// === УТРЕННИЙ ДАЙДЖЕСТ ===
// ============================================

async function sendMorning() {
    const news = await fetchNews(5);
    if (news.length === 0) return { sent: false, message: 'Нет новостей' };
    const market = await fetchMarketSummary();

    let message = '🌅 *CoinDigest — Утренний дайджест*\n';
    message += `🕐 ${formatMoscowTime()}\n\n`;
    message += `📰 *Главное за ночь:*\n\n`;

    for (let i = 0; i < news.length; i++) {
        const title = await translateToRussian(news[i].title);
        message += `${i + 1}. [${title}](${news[i].url})\n`;
        message += `   📌 _${news[i].source}_\n\n`;
    }

    if (market) {
        message += `💡 *Что это значит для рынка:*\n`;
        const trend = market.avgChange > 2 ? '📈 рынок растёт' :
                      market.avgChange < -2 ? '📉 рынок под давлением' :
                      '⚖️ рынок в боковике';
        message += `BTC сейчас *$${market.btcPrice}* (${market.btcChange > 0 ? '+' : ''}${market.btcChange}%).\n`;
        message += `Общий тренд: ${trend}.\n`;
        message += `Доминация BTC: ${market.btcDominance}.\n\n`;
    }

    message += `👇 *Полный анализ и графики — в Mini App*`;

    return await sendMessageWithButtons(message, [
        [{ text: '📱 Открыть Mini App', url: MINI_APP_URL }]
    ]);
}

// ============================================
// === АНАЛИТИКА ===
// ============================================

async function sendAnalytics() {
    const market = await fetchMarketSummary();
    if (!market) return { sent: false, message: 'Нет данных' };
    const topCoins = await fetchTopCoins();

    let message = '📊 *CoinDigest — Аналитика рынка*\n';
    message += `🕐 ${formatMoscowTime()}\n\n`;
    message += `💰 *Общий рынок:*\n`;
    message += `• Капитализация: ${market.totalMarketCap}\n`;
    message += `• Доминация BTC: ${market.btcDominance}\n`;
    message += `• Доминация ETH: ${market.ethDominance}\n\n`;
    message += `🏆 *Топ-5 монет:*\n`;
    for (const coin of topCoins) {
        const sign = coin.change >= 0 ? '+' : '';
        const emoji = coin.change >= 0 ? '🟢' : '🔴';
        message += `• ${emoji} *${coin.symbol}*: $${coin.price} (${sign}${coin.change}%)\n`;
    }

    const avg = topCoins.reduce((s, c) => s + parseFloat(c.change), 0) / (topCoins.length || 1);
    message += `\n💡 *Вывод:*\n`;
    if (avg > 3) message += `Рынок в фазе роста. Основной драйвер — спрос на топ-монеты.\n`;
    else if (avg < -3) message += `Рынок под давлением. Уровни поддержки BTC: $${(market.btcPrice * 0.95).toFixed(0)}.\n`;
    else message += `Смешанная динамика. Рынок ждёт триггера.\n`;

    message += `\n👇 *Графики и калькулятор прибыли — в Mini App*`;

    return await sendMessageWithButtons(message, [
        [{ text: '📱 Открыть Mini App', url: MINI_APP_URL }]
    ]);
}

// ============================================
// === ВЕЧЕРНИЙ ДАЙДЖЕСТ ===
// ============================================

async function sendEvening() {
    const news = await fetchNews(3);
    const education = getEducationalTip();

    let message = '🌙 *CoinDigest — Вечерний дайджест*\n';
    message += `🕐 ${formatMoscowTime()}\n\n`;

    if (news.length > 0) {
        message += `📰 *Итоги дня:*\n\n`;
        for (const item of news) {
            const title = await translateToRussian(item.title);
            message += `• [${title}](${item.url})\n`;
            message += `   📌 _${item.source}_\n\n`;
        }
    }

    message += `🎓 *Ликбез на вечер:*\n`;
    message += `${education.title}\n\n`;
    message += `${education.text}\n\n`;
    message += `👇 *Больше обучающих материалов — в Mini App*`;

    const result = await sendMessageWithButtons(message, [
        [{ text: '📱 Открыть Mini App', url: MINI_APP_URL }]
    ]);

    await sendPoll();
    return result;
}

// ============================================
// === ОПРОС ===
// ============================================

async function sendPoll() {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPoll`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                question: 'Куда пойдёт BTC завтра?',
                options: ['📈 Вверх', '📉 Вниз', '⚖️ Останется на месте'],
                is_anonymous: true,
                allows_multiple_answers: false
            })
        });
        const result = await response.json();
        return result.ok;
    } catch (e) { return false; }
}

// ============================================
// === ОБУЧЕНИЕ ===
// ============================================

function getEducationalTip() {
    const tips = [
        { title: '❓ Что такое ликвидность', text: 'Ликвидность — насколько легко купить или продать монету без резкого изменения цены.\n\n💡 *Совет:* не покупайте мелкие монеты на всю котлету.' },
        { title: '❓ Что такое проскальзывание (slippage)', text: 'Slippage — разница между ожидаемой ценой сделки и фактической.\n\n💡 *Совет:* используйте лимитные ордера.' },
        { title: '❓ Что такое доминация BTC', text: 'Доминация — доля биткоина в общей капитализации рынка.\n\n💡 *Совет:* следите за доминацией — это индикатор ротации капитала.' },
        { title: '❓ Что такое DCA', text: 'DCA — покупка на фиксированную сумму через равные интервалы.\n\n💡 *Совет:* DCA — лучшая стратегия для новичков.' },
        { title: '❓ Что такое Fear & Greed Index', text: 'Индекс страха и жадности — от 0 до 100.\n\n💡 *Совет:* когда все кричат «покупай», скорее всего поздно.' }
    ];
    return tips[Math.floor(Math.random() * tips.length)];
}

// ============================================
// === ОТПРАВКА С INLINE-КНОПКАМИ ===
// ============================================

async function sendMessageWithButtons(message, keyboard) {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const body = {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };
        if (keyboard) body.reply_markup = { inline_keyboard: keyboard };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (result.ok) return { sent: true, message: 'OK' };
        return { sent: false, message: result.description };
    } catch (error) {
        return { sent: false, message: error.message };
    }
}

// ============================================
// === ЗАГРУЗКА НОВОСТЕЙ ===
// ============================================

async function fetchNews(limit = 5) {
    let allNews = [];
    for (const source of NEWS_SOURCES) {
        try {
            const response = await fetch(source.url);
            if (!response.ok) continue;
            const data = await response.json();
            if (data && data.items) {
                const items = data.items.slice(0, 5).map(item => ({
                    title: item.title,
                    url: item.link,
                    source: source.name,
                    published_at: item.pubDate || new Date().toISOString()
                }));
                allNews = allNews.concat(items);
            }
        } catch (e) {}
    }
    return shuffleArray(allNews).slice(0, limit);
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
            const t = data.responseData.translatedText;
            if (t.includes('MYMEMORY WARNING') || t.includes('QUERY LENGTH LIMIT')) {
                return text;
            }
            return t;
        }
    } catch (e) {}
    return text;
}

// ============================================
// === ДАННЫЕ РЫНКА ===
// ============================================

async function fetchMarketSummary() {
    try {
        const globalRes = await fetch('https://api.coingecko.com/api/v3/global');
        const globalData = globalRes.ok ? await globalRes.json() : null;
        const btcRes = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=false'
        );
        const btcData = btcRes.ok ? await btcRes.json() : [];
        const btc = btcData.find(c => c.id === 'bitcoin') || {};

        let totalMarketCap = 'н/д', btcDominance = 'н/д', ethDominance = 'н/д';
        if (globalData && globalData.data) {
            const cap = globalData.data.total_market_cap?.usd;
            if (cap >= 1e12) totalMarketCap = '$' + (cap / 1e12).toFixed(2) + 'T';
            else if (cap >= 1e9) totalMarketCap = '$' + (cap / 1e9).toFixed(0) + 'B';
            const mcp = globalData.data.market_cap_percentage || {};
            if (mcp.btc) btcDominance = mcp.btc.toFixed(1) + '%';
            if (mcp.eth) ethDominance = mcp.eth.toFixed(1) + '%';
        }

        return {
            totalMarketCap, btcDominance, ethDominance,
            btcPrice: btc.current_price ? btc.current_price.toLocaleString() : 'н/д',
            btcChange: btc.price_change_percentage_24h ? btc.price_change_percentage_24h.toFixed(2) : '0',
            avgChange: btc.price_change_percentage_24h || 0
        };
    } catch (e) { return null; }
}

async function fetchTopCoins() {
    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false'
        );
        const data = res.ok ? await res.json() : [];
        return data.map(coin => ({
            symbol: coin.symbol.toUpperCase(),
            price: coin.current_price ? coin.current_price.toLocaleString() : '0',
            change: coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0'
        }));
    } catch (e) { return []; }
}

// ============================================
// === ВРЕМЯ МОСКВЫ ===
// ============================================

function formatMoscowTime() {
    const now = new Date();
    const msk = new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000);
    return msk.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

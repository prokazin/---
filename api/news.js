// ===== api/news.js — Vercel Serverless Function (CommonJS) =====
// Режимы: morning | analytics | evening
// Вызов: /api/news?secret=coindigest_2026&mode=morning

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

        let result;
        if (mode === 'analytics') {
            result = await sendAnalytics();
        } else if (mode === 'evening') {
            result = await sendEvening();
        } else {
            result = await sendMorning();
        }

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
// === КОНФИГ ===
// ============================================

const BOT_TOKEN = '8381752054:AAH6PbcijT-hDcgPn8iO_DPu1bwTO1Z5d08';  // ← ЗАМЕНИТЕ
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
// === РЕЖИМ: УТРЕННИЙ ДАЙДЖЕСТ (09:00 МСК) ===
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

    // Слой пользы
    if (market) {
        message += `💡 *Что это значит для рынка:*\n`;
        const trend = market.avgChange > 2 ? '📈 рынок растёт' :
                      market.avgChange < -2 ? '📉 рынок под давлением' :
                      '⚖️ рынок в боковике';
        message += `BTC сейчас *$${market.btcPrice}* (${market.btcChange > 0 ? '+' : ''}${market.btcChange}%).\n`;
        message += `Общий тренд: ${trend}.\n`;
        message += `Доминация BTC: ${market.btcDominance} — ${
            parseFloat(market.btcDominance) > 55 ? 'капитал идёт в биткоин' :
            'интерес к альткоинам растёт'
        }.\n\n`;
    }

    message += `📱 *Полный анализ и графики — в Mini App*`;
    message += `\n\n#дайджест #криптоновости 🌅`;

    return await sendMessage(message, true);
}

// ============================================
// === РЕЖИМ: АНАЛИТИКА (13:00 МСК) ===
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

    // Вывод
    const avg = topCoins.reduce((s, c) => s + parseFloat(c.change), 0) / topCoins.length;
    message += `\n💡 *Вывод:*\n`;
    if (avg > 3) {
        message += `Рынок в фазе роста. Основной драйвер — спрос на топ-монеты. Осторожно с новыми покупками на пике.\n`;
    } else if (avg < -3) {
        message += `Рынок под давлением. Возможны локальные отскоки. Уровни поддержки BTC: $${(market.btcPrice * 0.95).toFixed(0)} и $${(market.btcPrice * 0.9).toFixed(0)}.\n`;
    } else {
        message += `Смешанная динамика. Рынок ждёт триггера — макро-данных или новостей от регуляторов.\n`;
    }

    message += `\n📱 *Графики и калькулятор прибыли — в Mini App*`;
    message += `\n\n#аналитика #крипторынок 📊`;

    return await sendMessage(message, true);
}

// ============================================
// === РЕЖИМ: ВЕЧЕРНИЙ ДАЙДЖЕСТ (19:00 МСК) ===
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

    // Обучающий блок
    message += `🎓 *Ликбез на вечер:*\n`;
    message += `${education.title}\n\n`;
    message += `${education.text}\n\n`;

    message += `📱 *Больше обучающих материалов — в Mini App*`;
    message += `\n\n#обучение #итогидня 🌙`;

    const result = await sendMessage(message, true);

    // Опрос для вовлечённости
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
        console.log('Опрос:', result.ok ? 'отправлен' : result.description);
        return result.ok;
    } catch (e) {
        console.error('Ошибка опроса:', e.message);
        return false;
    }
}

// ============================================
// === ОБУЧАЮЩИЕ МАТЕРИАЛЫ ===
// ============================================

function getEducationalTip() {
    const tips = [
        {
            title: '❓ Что такое ликвидность простыми словами',
            text: 'Ликвидность — это насколько легко купить или продать монету без резкого изменения цены.\n\n• **Высокая ликвидность** (BTC, ETH) — можно купить на $100k и цена почти не сдвинется.\n• **Низкая ликвидность** (мелкие альты) — одна крупная покупка может сдвинуть цену на 10-20%.\n\n💡 *Совет:* не покупайте мелкие монеты на всю котлету — на выходе можете не найти покупателя.'
        },
        {
            title: '❓ Что такое проскальзывание (slippage)',
            text: 'Slippage — разница между ожидаемой ценой сделки и фактической.\n\nПример: вы хотите купить монету за $1.00, но из-за низкой ликвидности сделка проходит по $1.03. Slippage = 3%.\n\n💡 *Совет:* на биржах используйте лимитные ордера — они не дают slippage.'
        },
        {
            title: '❓ Что такое доминация BTC',
            text: 'Доминация — доля биткоина в общей капитализации рынка.\n\n• **Растёт** → деньги уходят из альтов в BTC (страх).\n• **Падает** → начинается альтсезон, капитал идёт в альткоины.\n\n💡 *Совет:* следите за доминацией BTC — это лучший индикатор ротации капитала.'
        },
        {
            title: '❓ Что такое DCA (усреднение)',
            text: 'DCA (Dollar-Cost Averaging) — стратегия покупки на фиксированную сумму через равные интервалы.\n\nПример: покупаете BTC на $100 каждую неделю — неважно, растёт цена или падает. Это снижает риск входа на пике.\n\n💡 *Совет:* DCA — лучшая стратегия для новичков, потому что не требует угадывать момент.'
        },
        {
            title: '❓ Что такое Fear & Greed Index',
            text: 'Индекс страха и жадности — от 0 (крайний страх) до 100 (крайняя жадность).\n\n• **0-25** → время покупать (все боятся).\n• **75-100** → время фиксировать прибыль (все жадные).\n\n💡 *Совет:* когда все вокруг кричат «покупай», скорее всего уже поздно.'
        }
    ];
    return tips[Math.floor(Math.random() * tips.length)];
}

// ============================================
// === ОТПРАВКА СООБЩЕНИЯ С INLINE-КНОПКОЙ ===
// ============================================

async function sendMessage(message, withButton = false) {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const body = {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };

        if (withButton) {
            body.reply_markup = {
                inline_keyboard: [[
                    {
                        text: '📱 Открыть Mini App',
                        url: MINI_APP_URL
                    }
                ]]
            };
        }

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
                const items = data.items.slice(0, 2).map(item => ({
                    title: item.title,
                    url: item.link,
                    source: source.name
                }));
                allNews = allNews.concat(items);
            }
        } catch (e) {
            console.error(`${source.name}:`, e.message);
        }
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
            return data.responseData.translatedText;
        }
    } catch (e) {}
    return text;
}

// ============================================
// === ДАННЫЕ О РЫНКЕ ===
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
        const eth = btcData.find(c => c.id === 'ethereum') || {};

        let totalMarketCap = 'н/д';
        let btcDominance = 'н/д';
        let ethDominance = 'н/д';

        if (globalData && globalData.data) {
            const cap = globalData.data.total_market_cap?.usd;
            if (cap >= 1e12) totalMarketCap = '$' + (cap / 1e12).toFixed(2) + 'T';
            else if (cap >= 1e9) totalMarketCap = '$' + (cap / 1e9).toFixed(0) + 'B';

            const mcp = globalData.data.market_cap_percentage || {};
            if (mcp.btc) btcDominance = mcp.btc.toFixed(1) + '%';
            if (mcp.eth) ethDominance = mcp.eth.toFixed(1) + '%';
        }

        return {
            totalMarketCap,
            btcDominance,
            ethDominance,
            btcPrice: btc.current_price ? btc.current_price.toLocaleString() : 'н/д',
            btcChange: btc.price_change_percentage_24h ? btc.price_change_percentage_24h.toFixed(2) : '0',
            avgChange: btc.price_change_percentage_24h || 0
        };
    } catch (e) {
        console.error('Ошибка рынка:', e.message);
        return null;
    }
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
    } catch (e) {
        return [];
    }
}

// ============================================
// === ВРЕМЯ МОСКВЫ ===
// ============================================

function formatMoscowTime() {
    const now = new Date();
    const msk = new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000);
    return msk.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

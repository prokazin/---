// ===== send-news.js — запускается в GitHub Actions =====
const fs = require('fs');

// === КОНФИГ ===
const BOT_TOKEN = '8422981212:AAFqUt5juqdC_l64q7FACOBw-mFL4f0hN8Y';
const CHAT_ID = '-1004345602790';

// === ИСТОЧНИКИ НОВОСТЕЙ ===
const NEWS_SOURCES = [
    {
        name: 'CoinDesk',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/feed',
        limit: 3
    },
    {
        name: 'Cointelegraph',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/feed',
        limit: 3
    },
    {
        name: 'CryptoPotato',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cryptopotato.com/feed',
        limit: 2
    },
    {
        name: 'Bitcoin.com',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://news.bitcoin.com/feed',
        limit: 2
    }
];

// === АЛЬТКОИНЫ ДЛЯ ФИЛЬТРАЦИИ ===
const ALTCOIN_KEYWORDS = [
    'xrp', 'ripple', 'pepe', 'dogecoin', 'doge', 'solana', 'sol',
    'cardano', 'ada', 'polygon', 'matic', 'shiba', 'shib', 'avalanche', 'avax',
    'chainlink', 'link', 'polkadot', 'dot', 'litecoin', 'ltc'
];

// === ОСНОВНЫЕ ФУНКЦИИ ===

// Перевод через MyMemory API
async function translateToRussian(text) {
    if (!text) return 'Новость';
    if (/[а-яА-Я]/.test(text)) return text;
    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ru`
        );
        const data = await response.json();
        return data.responseData?.translatedText || text;
    } catch (e) {
        return text;
    }
}

// Проверка, содержит ли новость альткоин
function isAltcoinNews(title) {
    const lower = title.toLowerCase();
    return ALTCOIN_KEYWORDS.some(kw => lower.includes(kw));
}

// Загрузка новостей из источника
async function fetchNews(source) {
    try {
        const response = await fetch(source.url);
        if (!response.ok) return [];
        const data = await response.json();
        if (!data.items) return [];
        return data.items.slice(0, source.limit).map(item => ({
            title: item.title,
            url: item.link,
            source: source.name,
            published_at: item.pubDate || new Date().toISOString()
        }));
    } catch (e) {
        console.error(`Ошибка ${source.name}:`, e.message);
        return [];
    }
}

// Отправка в Telegram
async function sendToTelegram(message) {
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
        return result.ok;
    } catch (e) {
        console.error('Ошибка отправки:', e.message);
        return false;
    }
}

// === ГЛАВНАЯ ФУНКЦИЯ ===
async function main() {
    console.log('🔄 Начинаем сбор новостей...');

    // 1. Загружаем все новости
    let allNews = [];
    for (const source of NEWS_SOURCES) {
        const news = await fetchNews(source);
        allNews = allNews.concat(news);
        console.log(`✅ ${source.name}: загружено ${news.length} новостей`);
    }

    if (allNews.length === 0) {
        console.log('❌ Новостей не найдено');
        return;
    }

    // 2. Читаем историю отправленных новостей
    const historyFile = 'sent_history.json';
    let sentTitles = [];
    if (fs.existsSync(historyFile)) {
        sentTitles = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        console.log(`📚 В истории ${sentTitles.length} записей`);
    }

    // 3. Фильтруем новые новости
    const newNews = allNews.filter(item => {
        const title = item.title || 'Новость';
        return !sentTitles.includes(title);
    });

    if (newNews.length === 0) {
        console.log('ℹ️ Новых новостей нет');
        return;
    }

    console.log(`🆕 Найдено ${newNews.length} новых новостей`);

    // 4. Обновляем историю
    const newTitles = newNews.map(item => item.title);
    const updatedHistory = [...sentTitles, ...newTitles];
    fs.writeFileSync(historyFile, JSON.stringify(updatedHistory, null, 2));

    // 5. Формируем сообщение
    const mainNews = newNews.filter(item => !isAltcoinNews(item.title)).slice(0, 5);
    const altNews = newNews.filter(item => isAltcoinNews(item.title)).slice(0, 5);

    let message = '📰 *CoinDigest — Свежие новости*\n\n';
    let count = 0;

    // Сначала основные новости
    if (mainNews.length > 0) {
        message += `📌 *Основные новости:*\n`;
        for (const item of mainNews) {
            const titleRu = await translateToRussian(item.title);
            message += `${count + 1}. [${titleRu}](${item.url})\n`;
            message += `   📍 ${item.source}\n\n`;
            count++;
        }
    }

    // Потом альткоины
    if (altNews.length > 0) {
        message += `🪙 *Новости альткоинов:*\n`;
        for (const item of altNews) {
            const titleRu = await translateToRussian(item.title);
            message += `${count + 1}. [${titleRu}](${item.url})\n`;
            message += `   📍 ${item.source}\n\n`;
            count++;
        }
    }

    message += `🔄 Обновлено: ${new Date().toLocaleString('ru-RU')}`;

    // 6. Отправляем в Telegram
    const sent = await sendToTelegram(message);
    if (sent) {
        console.log(`✅ Отправлено ${newNews.length} новостей (${mainNews.length} основных, ${altNews.length} альткоинов)`);
    } else {
        console.log('❌ Ошибка отправки в Telegram');
    }
}

// === ЗАПУСК ===
main().catch(console.error);

// ===== ПРЕФИКС ДЛЯ LOCALSTORAGE =====
const STORAGE_PREFIX = 'coindigest_';
const LS = {
    get: (key) => JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)),
    set: (key, val) => localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)),
};

// ===== СБОР СТАТИСТИКИ =====
function trackVisit() {
    let visits = LS.get('visits') || 0;
    visits++;
    LS.set('visits', visits);

    const todayKey = new Date().toISOString().split('T')[0];
    let todayStats = LS.get('todayStats') || {};
    if (todayStats.date !== todayKey) {
        todayStats = { date: todayKey, count: 0 };
    }
    todayStats.count++;
    LS.set('todayStats', todayStats);

    const weekKey = getWeekKey();
    let weekStats = LS.get('weekStats') || {};
    if (weekStats.week !== weekKey) {
        weekStats = { week: weekKey, count: 0 };
    }
    weekStats.count++;
    LS.set('weekStats', weekStats);
}

function getWeekKey() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return start.toISOString().split('T')[0];
}

// ===== TELEGRAM MINI APP =====
let tgApp = null;
try {
    if (window.Telegram && window.Telegram.WebApp) {
        tgApp = window.Telegram.WebApp;
        tgApp.ready();
        document.body.classList.add('tg-app');
        console.log('✅ Telegram Mini App инициализирован');
    }
} catch (e) {
    console.log('ℹ️ Не Telegram окружение');
}

// ===== СПИСОК АЛЬТКОИНОВ =====
const ALTCOIN_KEYWORDS = [
    'xrp', 'ripple', 'pepe', 'dogecoin', 'doge', 'solana', 'sol', 
    'cardano', 'ada', 'polygon', 'matic', 'shiba', 'shib', 'avalanche', 'avax',
    'chainlink', 'link', 'polkadot', 'dot', 'litecoin', 'ltc',
    'uniswap', 'uni', 'cosmos', 'atom', 'stellar', 'xlm', 'vechain', 'vet',
    'algorand', 'algo', 'filecoin', 'fil', 'theta', 'near', 'flow', 'hedera', 'hbar',
    'quant', 'qnt', 'elrond', 'egld', 'arbitrum', 'arb',
    'optimism', 'op', 'aptos', 'apt', 'sui', 'sei', 'injective', 'inj'
];

// ===== ИСТОЧНИКИ НОВОСТЕЙ =====
const NEWS_SOURCES = [
    {
        name: 'CoinDesk (RSS)',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/feed',
        parser: (data) => {
            if (!data || !data.items) return [];
            return data.items.map(item => ({
                title: item.title,
                url: item.link,
                source: { title: 'CoinDesk' },
                published_at: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || null
            }));
        },
        limit: 3
    },
    {
        name: 'Cointelegraph (RSS)',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/feed',
        parser: (data) => {
            if (!data || !data.items) return [];
            return data.items.map(item => ({
                title: item.title,
                url: item.link,
                source: { title: 'Cointelegraph' },
                published_at: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || null
            }));
        },
        limit: 3
    },
    {
        name: 'CryptoPotato (RSS)',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cryptopotato.com/feed',
        parser: (data) => {
            if (!data || !data.items) return [];
            return data.items.map(item => ({
                title: item.title,
                url: item.link,
                source: { title: 'CryptoPotato' },
                published_at: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || null
            }));
        },
        limit: 2
    },
    {
        name: 'Bitcoin.com (RSS)',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://news.bitcoin.com/feed',
        parser: (data) => {
            if (!data || !data.items) return [];
            return data.items.map(item => ({
                title: item.title,
                url: item.link,
                source: { title: 'Bitcoin.com' },
                published_at: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || null
            }));
        },
        limit: 2
    }
];

// ===== РАСШИРЕННЫЕ ИСТОЧНИКИ ДЛЯ АЛЬТКОИНОВ =====
const ALTCOIN_SOURCES = [
    {
        name: 'Altcoin Daily',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://altcoindaily.io/feed',
        parser: (data) => {
            if (!data || !data.items) return [];
            return data.items.map(item => ({
                title: item.title,
                url: item.link,
                source: { title: 'Altcoin Daily' },
                published_at: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || null
            }));
        },
        limit: 2
    },
    {
        name: 'CoinGape',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://coingape.com/feed',
        parser: (data) => {
            if (!data || !data.items) return [];
            return data.items.map(item => ({
                title: item.title,
                url: item.link,
                source: { title: 'CoinGape' },
                published_at: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || null
            }));
        },
        limit: 2
    },
    {
        name: 'CryptoNews',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cryptonews.com/news/altcoins/feed',
        parser: (data) => {
            if (!data || !data.items) return [];
            return data.items.map(item => ({
                title: item.title,
                url: item.link,
                source: { title: 'CryptoNews' },
                published_at: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || null
            }));
        },
        limit: 2
    },
    {
        name: 'U.Today',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://u.today/rss',
        parser: (data) => {
            if (!data || !data.items) return [];
            return data.items.map(item => ({
                title: item.title,
                url: item.link,
                source: { title: 'U.Today' },
                published_at: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || null
            }));
        },
        limit: 2
    },
    {
        name: 'Reddit Altcoins',
        url: 'https://www.reddit.com/r/CryptoCurrency/.json?limit=10',
        parser: (data) => {
            if (!data || !data.data || !data.data.children) return [];
            return data.data.children.map(child => ({
                title: child.data.title,
                url: 'https://reddit.com' + child.data.permalink,
                source: { title: 'Reddit' },
                published_at: new Date(child.data.created_utc * 1000).toISOString(),
                thumbnail: child.data.thumbnail && child.data.thumbnail.startsWith('http') ? child.data.thumbnail : null
            }));
        },
        limit: 4
    },
    {
        name: 'Reddit AltStreetBets',
        url: 'https://www.reddit.com/r/AltStreetBets/.json?limit=8',
        parser: (data) => {
            if (!data || !data.data || !data.data.children) return [];
            return data.data.children.map(child => ({
                title: child.data.title,
                url: 'https://reddit.com' + child.data.permalink,
                source: { title: 'Reddit AltStreetBets' },
                published_at: new Date(child.data.created_utc * 1000).toISOString(),
                thumbnail: child.data.thumbnail && child.data.thumbnail.startsWith('http') ? child.data.thumbnail : null
            }));
        },
        limit: 3
    }
];

// ===== ЭКСКЛЮЗИВНЫЕ КЛЮЧЕВЫЕ СЛОВА =====
const EXCLUSIVE_KEYWORDS = [
    'эксклюзив', 'инсайд', 'аналитика', 'прогноз', 'отчет', 
    'анализ', 'тенденция', 'рынок', 'инвестиции', 'стратегия',
    'exclusive', 'insight', 'analysis', 'forecast', 'report',
    'trend', 'market', 'investment', 'strategy'
];

// ===== ПЕРЕМЕННЫЕ =====
let lastNewsTitles = [];
let lastAltcoinTitles = [];
let notificationEnabled = false;
let pendingNotification = null;
let adInterval = null;
let currentAdIndex = 0;

// ===== ПЕРЕВОДЧИК: MYMEMORY (С ЛИМИТОМ) =====
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
        console.warn('Ошибка перевода:', e);
    }
    return text;
}

// ===== ЗАГРУЗКА КРИПТОВАЛЮТ =====
async function loadCrypto() {
    const container = document.getElementById('cryptoContainer');
    container.innerHTML = Array(12).fill(0).map(() => 
        '<div class="skeleton" style="height:clamp(100px, 12vw, 130px);border-radius:12px;"></div>'
    ).join('');

    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false'
        );
        const data = await response.json();
        container.innerHTML = '';

        data.forEach(coin => {
            const change = coin.price_change_percentage_24h;
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changeSign = change >= 0 ? '+' : '';

            const card = document.createElement('div');
            card.className = 'crypto-card';
            card.innerHTML = `
                <div class="name">
                    <img src="${coin.image}" alt="${coin.name}" loading="lazy" width="28" height="28" />
                    ${coin.name}
                    <span class="symbol">${coin.symbol.toUpperCase()}</span>
                </div>
                <div class="price">$${coin.current_price.toLocaleString()}</div>
                <div class="change ${changeClass}">${changeSign}${change.toFixed(2)}%</div>
            `;
            container.appendChild(card);
        });

        document.getElementById('updateTime').textContent = 
            'Обновление: ' + new Date().toLocaleTimeString();

    } catch (error) {
        container.innerHTML = 
            '<p style="color:var(--red);grid-column:1/-1;text-align:center;">⚠️ Не удалось загрузить данные</p>';
        console.error('Ошибка загрузки криптовалют:', error);
    }
}

// ===== ОПТИМИЗАЦИЯ КАРТИНОК =====
function optimizeImageUrl(url) {
    if (!url) return null;
    if (url.includes('reddit.com') && url.includes('?format=')) {
        return url.replace('?format=png', '?format=webp');
    }
    return url;
}

// ===== ПРОВЕРКА НА АЛЬТКОИН =====
function isAltcoinNews(title) {
    const lowerTitle = title.toLowerCase();
    return ALTCOIN_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

// ===== ЗАГРУЗКА НОВОСТЕЙ =====
async function loadNews() {
    const container = document.getElementById('newsContainer');
    container.innerHTML = Array(6).fill(0).map(() => 
        '<div class="skeleton" style="height:clamp(120px, 15vw, 160px);border-radius:12px;"></div>'
    ).join('');

    let allNews = [];
    let newTitles = [];

    for (const source of NEWS_SOURCES) {
        try {
            const response = await fetch(source.url);
            
            if (!response.ok) {
                console.warn(`⚠️ Ошибка ${source.name}: ${response.status}`);
                continue;
            }

            const data = await response.json();
            const articles = source.parser(data);
            
            if (articles && articles.length > 0) {
                const limited = articles.slice(0, source.limit);
                allNews = allNews.concat(limited.map(item => ({
                    ...item,
                    sourceName: source.name,
                    thumbnail: optimizeImageUrl(item.thumbnail)
                })));
                console.log(`✅ ${source.name}: загружено ${limited.length} новостей`);
            }
        } catch (error) {
            console.error(`❌ Ошибка ${source.name}:`, error);
        }
    }

    if (allNews.length === 0) {
        container.innerHTML = '<p style="color:var(--red);grid-column:1/-1;text-align:center;">⚠️ Не удалось загрузить новости</p>';
        return;
    }

    allNews = shuffleArray(allNews);
    const displayNews = allNews.slice(0, 6);

    newTitles = displayNews.map(item => item.title);
    checkNewNews(newTitles);

    container.innerHTML = '';
    for (const item of displayNews) {
        const titleRu = await translateToRussian(item.title);
        
        const card = document.createElement('div');
        card.className = 'news-card';
        
        let thumbnailHtml = '';
        if (item.thumbnail && item.thumbnail.startsWith('http')) {
            thumbnailHtml = `
                <div style="margin-bottom:8px;overflow:hidden;border-radius:6px;background:var(--bg-primary);">
                    <img src="${item.thumbnail}" alt="" loading="lazy" 
                         style="width:100%;height:auto;max-height:160px;object-fit:cover;display:block;" />
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="news-source">
                <i class="fas fa-globe"></i> 
                ${item.source?.title || item.sourceName || 'Unknown'}
                <span style="margin-left:auto;color:var(--text-secondary);font-size:clamp(9px,0.8vw,11px);">
                    ${item.published_at ? new Date(item.published_at).toLocaleDateString('ru-RU') : 'Сегодня'}
                </span>
                <span class="source-badge">${item.sourceName || ''}</span>
            </div>
            ${thumbnailHtml}
            <h3><a href="${item.url}" target="_blank" rel="noopener">${titleRu}</a></h3>
        `;
        container.appendChild(card);
    }
}

// ===== ЗАГРУЗКА НОВОСТЕЙ АЛЬТКОИНОВ =====
async function loadAltcoinNews() {
    const container = document.getElementById('altcoinContainer');
    if (!container) return;
    
    container.innerHTML = Array(6).fill(0).map(() => 
        '<div class="skeleton" style="height:clamp(120px, 15vw, 160px);border-radius:12px;"></div>'
    ).join('');

    let allNews = [];

    for (const source of ALTCOIN_SOURCES) {
        try {
            const response = await fetch(source.url);
            
            if (!response.ok) {
                console.warn(`⚠️ Ошибка ${source.name}: ${response.status}`);
                continue;
            }

            const data = await response.json();
            const articles = source.parser(data);
            
            if (articles && articles.length > 0) {
                const filtered = articles.filter(item => isAltcoinNews(item.title));
                const limited = filtered.slice(0, source.limit);
                allNews = allNews.concat(limited.map(item => ({
                    ...item,
                    sourceName: source.name,
                    thumbnail: optimizeImageUrl(item.thumbnail)
                })));
                console.log(`✅ ${source.name}: загружено ${limited.length} новостей об альткоинах`);
            }
        } catch (error) {
            console.error(`❌ Ошибка ${source.name}:`, error);
        }
    }

    if (allNews.length === 0) {
        container.innerHTML = '<p style="color:var(--red);grid-column:1/-1;text-align:center;">⚠️ Новостей альткоинов пока нет</p>';
        return;
    }

    allNews = shuffleArray(allNews);
    const displayNews = allNews.slice(0, 10);

    container.innerHTML = '';
    for (const item of displayNews) {
        const titleRu = await translateToRussian(item.title);
        
        const card = document.createElement('div');
        card.className = 'news-card';
        
        let thumbnailHtml = '';
        if (item.thumbnail && item.thumbnail.startsWith('http')) {
            thumbnailHtml = `
                <div style="margin-bottom:8px;overflow:hidden;border-radius:6px;background:var(--bg-primary);">
                    <img src="${item.thumbnail}" alt="" loading="lazy" 
                         style="width:100%;height:auto;max-height:160px;object-fit:cover;display:block;" />
                </div>
            `;
        }
        
        let mentionedCoin = '';
        const lowerTitle = item.title.toLowerCase();
        for (const keyword of ALTCOIN_KEYWORDS) {
            if (lowerTitle.includes(keyword)) {
                mentionedCoin = keyword.toUpperCase();
                break;
            }
        }
        
        card.innerHTML = `
            <div class="news-source">
                <i class="fas fa-coins"></i> 
                ${mentionedCoin ? `🪙 ${mentionedCoin}` : 'Альткоин'}
                <span style="margin-left:auto;color:var(--text-secondary);font-size:clamp(9px,0.8vw,11px);">
                    ${item.published_at ? new Date(item.published_at).toLocaleDateString('ru-RU') : 'Сегодня'}
                </span>
                <span class="source-badge">${item.sourceName || ''}</span>
            </div>
            ${thumbnailHtml}
            <h3><a href="${item.url}" target="_blank" rel="noopener">${titleRu}</a></h3>
        `;
        container.appendChild(card);
    }
}

// ===== ПРОВЕРКА НОВЫХ НОВОСТЕЙ =====
function checkNewNews(newTitles) {
    if (lastNewsTitles.length === 0) {
        lastNewsTitles = newTitles;
        return;
    }

    const newItems = newTitles.filter(title => !lastNewsTitles.includes(title));
    
    if (newItems.length > 0 && notificationEnabled) {
        const message = `📰 Новая новость: ${newItems[0].substring(0, 60)}...`;
        showNotification('📰', message);
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('CoinDigest — Новая новость!', {
                body: newItems[0].substring(0, 100) + '...',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🪙</text></svg>'
            });
        }
    }

    lastNewsTitles = newTitles;
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(icon, text) {
    const banner = document.getElementById('notificationBanner');
    if (!banner) {
        createNotificationBanner();
        setTimeout(() => showNotification(icon, text), 100);
        return;
    }

    const iconEl = banner.querySelector('.notif-icon');
    const textEl = banner.querySelector('.notif-text');
    
    if (iconEl) iconEl.innerHTML = `<i class="${icon.includes('fa-') ? icon : 'fas fa-bell'}"></i>`;
    if (textEl) textEl.innerHTML = text;
    
    banner.classList.add('show');
    
    clearTimeout(pendingNotification);
    pendingNotification = setTimeout(() => {
        banner.classList.remove('show');
    }, 8000);
}

function createNotificationBanner() {
    const banner = document.createElement('div');
    banner.id = 'notificationBanner';
    banner.className = 'notification-banner';
    banner.innerHTML = `
        <div class="notif-content">
            <div class="notif-icon"><i class="fas fa-bell"></i></div>
            <div class="notif-text">Новое уведомление</div>
            <button class="notif-close" onclick="this.closest('.notification-banner').classList.remove('show')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(banner);
}

// ===== ЗАПРОС РАЗРЕШЕНИЯ НА УВЕДОМЛЕНИЯ =====
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notificationEnabled = true;
                showNotification('🔔', '✅ Уведомления включены!');
            } else {
                notificationEnabled = false;
            }
        });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        notificationEnabled = true;
    }
}

// ===== РЕКЛАМА =====
function loadAd() {
    const container = document.getElementById('adContainer');
    const ads = LS.get('ads') || [];
    
    if (!ads || ads.length === 0) {
        container.innerHTML = '';
        return;
    }

    showAd(ads, currentAdIndex);
    
    if (adInterval) clearInterval(adInterval);
    adInterval = setInterval(() => {
        currentAdIndex = (currentAdIndex + 1) % ads.length;
        showAd(ads, currentAdIndex);
    }, 30000);
}

function showAd(ads, index) {
    const container = document.getElementById('adContainer');
    const ad = ads[index];
    if (!ad) return;

    let html = '<div class="ad-content">';
    
    if (ad.type === 'image' && ad.url) {
        html += `<img src="${ad.url}" alt="Реклама" loading="lazy" />`;
    } else if (ad.type === 'gif' && ad.url) {
        html += `<img src="${ad.url}" alt="Реклама GIF" loading="lazy" style="max-height:200px;" />`;
    } else if (ad.type === 'video' && ad.url) {
        html += `<video controls autoplay muted loop style="max-height:200px;border-radius:8px;">
                    <source src="${ad.url}" type="video/mp4">
                    Ваш браузер не поддерживает видео
                </video>`;
    } else if (ad.type === 'link' && ad.url) {
        html += `<a href="${ad.link}" target="_blank" rel="noopener">${ad.text || 'Перейти по ссылке'}</a>`;
    } else if (ad.type === 'html' && ad.text) {
        html += ad.text;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ===== ЭКСКЛЮЗИВНЫЕ МАТЕРИАЛЫ =====
async function loadExclusivePosts() {
    const container = document.getElementById('postsContainer');
    
    try {
        const response = await fetch('data/posts.json');
        let posts = await response.json();
        
        const autoExclusive = await fetchExclusiveContent();
        posts = posts.concat(autoExclusive);
        
        const uniquePosts = [];
        const seenTitles = new Set();
        for (const post of posts) {
            if (!seenTitles.has(post.title)) {
                seenTitles.add(post.title);
                uniquePosts.push(post);
            }
        }
        posts = uniquePosts.slice(0, 9);
        
        container.innerHTML = '';

        if (posts.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;">Материалы загружаются...</p>';
            return;
        }

        posts.slice().reverse().forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <h3>${post.url ? `<a href="${post.url}" target="_blank">${post.title}</a>` : post.title}</h3>
                <div class="date">${post.date}</div>
                <p>${post.content ? post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '') : ''}</p>
                ${post.isExclusive ? '<span style="display:inline-block;background:var(--accent);color:var(--bg-primary);font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;margin-top:6px;">⭐ ЭКСКЛЮЗИВ</span>' : ''}
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Ошибка загрузки постов:', error);
        const autoPosts = await fetchExclusiveContent();
        if (autoPosts.length > 0) {
            renderAutoPosts(autoPosts);
        }
    }
}

// ===== АВТОМАТИЧЕСКИЙ СБОР ЭКСКЛЮЗИВОВ =====
async function fetchExclusiveContent() {
    try {
        const sources = [
            'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/feed',
            'https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/feed',
            'https://api.rss2json.com/v1/api.json?rss_url=https://cryptopotato.com/feed',
            'https://api.rss2json.com/v1/api.json?rss_url=https://news.bitcoin.com/feed'
        ];
        
        let exclusivePosts = [];
        const maxPosts = 6;
        
        for (const url of sources) {
            if (exclusivePosts.length >= maxPosts) break;
            
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                
                const data = await response.json();
                if (!data || !data.items) continue;
                
                for (const item of data.items) {
                    if (exclusivePosts.length >= maxPosts) break;
                    
                    const text = (item.title + ' ' + (item.description || '')).toLowerCase();
                    const isExclusive = EXCLUSIVE_KEYWORDS.some(keyword => 
                        text.includes(keyword.toLowerCase())
                    );
                    
                    if (isExclusive) {
                        exclusivePosts.push({
                            title: item.title,
                            url: item.link,
                            content: item.description || 'Эксклюзивный аналитический материал',
                            date: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            isExclusive: true
                        });
                    }
                }
            } catch (e) {
                console.warn('Ошибка парсинга источника:', e);
            }
        }
        
        return exclusivePosts;
    } catch (error) {
        console.error('Ошибка автоматического сбора эксклюзивов:', error);
        return [];
    }
}

function renderAutoPosts(posts) {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';
    posts.slice(0, 6).forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <h3><a href="${post.url}" target="_blank">${post.title}</a></h3>
            <div class="date">${post.date}</div>
            <p>${post.content ? post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '') : 'Эксклюзивный материал'}</p>
            ${post.isExclusive ? '<span style="display:inline-block;background:var(--accent);color:var(--bg-primary);font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;margin-top:6px;">⭐ ЭКСКЛЮЗИВ</span>' : ''}
        `;
        container.appendChild(card);
    });
}

// ===== ПЕРЕМЕШИВАНИЕ =====
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================
// ===== AI-АНАЛИЗ КРИПТОРЫНКА =====
// ============================================

async function generateCryptoAnalysis() {
    try {
        const priceResponse = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'
        );
        const coins = await priceResponse.json();
        
        let news = [];
        try {
            const newsResponse = await fetch('data/news_cache.json');
            if (newsResponse.ok) {
                news = await newsResponse.json();
            }
        } catch (e) {
            news = [
                { title: 'Биткоин показывает волатильность на фоне макроэкономических данных' },
                { title: 'Эфир укрепляется благодаря развитию Layer-2 решений' },
                { title: 'Альткоины демонстрируют смешанную динамику' }
            ];
        }

        let priceChanges = [];
        let totalChange = 0;

        coins.forEach(coin => {
            const change = coin.price_change_percentage_24h || 0;
            priceChanges.push({
                name: coin.name,
                symbol: coin.symbol.toUpperCase(),
                price: coin.current_price,
                change: change
            });
            totalChange += change;
        });

        const avgChange = (totalChange / coins.length).toFixed(2);

        let trend = 'нейтральный';
        let trendEmoji = '⚖️';
        if (avgChange > 3) {
            trend = 'бычий';
            trendEmoji = '🐂';
        } else if (avgChange < -3) {
            trend = 'медвежий';
            trendEmoji = '🐻';
        }

        const bullishKeywords = ['рост', 'бычий', 'растёт', 'увеличивается', 'покупают', 'инвестиции', 'одобрение', 'прорыв'];
        const bearishKeywords = ['падение', 'медвежий', 'падает', 'снижается', 'продают', 'регуляция', 'запрет', 'риск'];
        
        let bullishNewsCount = 0;
        let bearishNewsCount = 0;

        news.slice(0, 10).forEach(item => {
            const text = (item.title || '').toLowerCase();
            bullishKeywords.forEach(kw => {
                if (text.includes(kw)) bullishNewsCount++;
            });
            bearishKeywords.forEach(kw => {
                if (text.includes(kw)) bearishNewsCount++;
            });
        });

        let sentiment = 'нейтральное';
        let sentimentEmoji = '😐';
        if (bullishNewsCount > bearishNewsCount + 2) {
            sentiment = 'позитивное';
            sentimentEmoji = '😊';
        } else if (bearishNewsCount > bullishNewsCount + 2) {
            sentiment = 'негативное';
            sentimentEmoji = '😰';
        }

        const timeOfDay = new Date().getHours() < 12 ? 'утренний' : 'вечерний';
        const dateStr = new Date().toLocaleDateString('ru-RU');
        
        const sortedByChange = [...priceChanges].sort((a, b) => b.change - a.change);
        const topGainers = sortedByChange.slice(0, 3).filter(c => c.change > 0);
        const topLosers = sortedByChange.slice(-3).filter(c => c.change < 0);

        let analysis = `📊 *${timeOfDay === 'утренний' ? '🌅 Утренний' : '🌙 Вечерний'} анализ крипторынка*\n`;
        analysis += `📅 ${dateStr}\n\n`;

        analysis += `📈 *Общий тренд:* ${trendEmoji} ${trend}\n`;
        analysis += `📊 *Среднее изменение:* ${avgChange > 0 ? '+' : ''}${avgChange}%\n`;
        analysis += `😌 *Настроение:* ${sentimentEmoji} ${sentiment}\n\n`;

        if (topGainers.length > 0) {
            analysis += `🟢 *Лидеры роста:*\n`;
            topGainers.forEach(c => {
                analysis += `  • ${c.symbol}: +${c.change.toFixed(2)}% ($${c.price.toFixed(2)})\n`;
            });
        }

        if (topLosers.length > 0) {
            analysis += `\n🔴 *Лидеры падения:*\n`;
            topLosers.forEach(c => {
                analysis += `  • ${c.symbol}: ${c.change.toFixed(2)}% ($${c.price.toFixed(2)})\n`;
            });
        }

        analysis += `\n📰 *Ключевые новости:*\n`;
        news.slice(0, 3).forEach(item => {
            const title = item.title || 'Новость';
            analysis += `  • ${title.substring(0, 60)}...\n`;
        });

        analysis += `\n💡 *Рекомендация:* `;
        if (trend === 'бычий' && sentiment === 'позитивное') {
            analysis += `Рынок выглядит позитивно. Возможно усиление восходящего тренда. 🟢`;
        } else if (trend === 'медвежий' && sentiment === 'негативное') {
            analysis += `Рынок находится под давлением. Рекомендуется осторожность. 🔴`;
        } else {
            analysis += `Рынок неопределённый. Следите за ключевыми уровнями. ⚖️`;
        }

        analysis += `\n\n🔄 *Актуальные цены:*\n`;
        priceChanges.slice(0, 5).forEach(c => {
            const sign = c.change > 0 ? '+' : '';
            analysis += `  • ${c.symbol}: $${c.price.toFixed(2)} (${sign}${c.change.toFixed(2)}%)\n`;
        });

        analysis += `\n🔗 *Подробнее на сайте:* ${window.location.href}`;

        return analysis;
    } catch (error) {
        console.error('Ошибка генерации анализа:', error);
        return null;
    }
}

async function sendAnalysisToTelegram(analysis) {
    if (!analysis) return;

    const BOT_TOKEN = '8422981212:AAFqUt5juqdC_l64q7FACOBw-mFL4f0hN8Y';
    const CHAT_ID = '-1004345602790';

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: analysis,
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                disable_notification: false
            })
        });

        const result = await response.json();
        if (result.ok) {
            console.log('✅ Анализ отправлен в канал');
        } else {
            console.error('❌ Ошибка отправки анализа:', result.description);
        }
    } catch (error) {
        console.error('❌ Ошибка отправки анализа:', error);
    }
}

async function checkAndSendAnalysis() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const dateKey = now.toISOString().split('T')[0];

    if (hours === 9 && minutes < 5) {
        const key = `morning_${dateKey}`;
        if (LS.get(key)) return;
        LS.set(key, true);
        
        console.log('📊 Генерируем утренний анализ...');
        const analysis = await generateCryptoAnalysis();
        await sendAnalysisToTelegram(analysis);
    }

    if (hours === 21 && minutes < 5) {
        const key = `evening_${dateKey}`;
        if (LS.get(key)) return;
        LS.set(key, true);
        
        console.log('📊 Генерируем вечерний анализ...');
        const analysis = await generateCryptoAnalysis();
        await sendAnalysisToTelegram(analysis);
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
function setupTabs() {
    const tabs = document.querySelectorAll('[data-tab]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabName = this.dataset.tab;
            
            if (tabName === 'main') {
                document.getElementById('cryptoSection').style.display = 'block';
                document.getElementById('newsSection').style.display = 'block';
                document.getElementById('altcoinSection').style.display = 'none';
                document.querySelector('.blog-section').style.display = 'block';
            } else if (tabName === 'crypto') {
                document.getElementById('cryptoSection').style.display = 'block';
                document.getElementById('newsSection').style.display = 'none';
                document.getElementById('altcoinSection').style.display = 'none';
                document.querySelector('.blog-section').style.display = 'none';
            } else if (tabName === 'news') {
                document.getElementById('cryptoSection').style.display = 'none';
                document.getElementById('newsSection').style.display = 'block';
                document.getElementById('altcoinSection').style.display = 'none';
                document.querySelector('.blog-section').style.display = 'none';
            } else if (tabName === 'altcoins') {
                document.getElementById('cryptoSection').style.display = 'none';
                document.getElementById('newsSection').style.display = 'none';
                document.getElementById('altcoinSection').style.display = 'block';
                document.querySelector('.blog-section').style.display = 'none';
                
                if (document.getElementById('altcoinContainer').children.length <= 1) {
                    loadAltcoinNews();
                }
            }
        });
    });
}

// ===== МОБИЛЬНОЕ МЕНЮ =====
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileMenu.classList.toggle('open');
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = mobileMenu.classList.contains('open') 
                    ? 'fas fa-times' 
                    : 'fas fa-bars';
            }
        });

        document.addEventListener('click', function(e) {
            if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                mobileMenu.classList.remove('open');
                const icon = menuBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            }
        });
    }

    setupTabs();
    trackVisit();
    setTimeout(requestNotificationPermission, 2000);
    loadAd();
    loadAltcoinNews();
});

// ===== ЗАПУСК =====
loadCrypto();
loadNews();
loadExclusivePosts();

setTimeout(checkAndSendAnalysis, 5000);
setInterval(checkAndSendAnalysis, 60000);

setInterval(() => {
    loadCrypto();
    loadNews();
    loadAltcoinNews();
    loadExclusivePosts();
}, 3600000);

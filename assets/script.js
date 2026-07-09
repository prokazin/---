// ===== ПРЕФИКС ДЛЯ LOCALSTORAGE =====
const STORAGE_PREFIX = 'coindigest_';
const LS = {
    get: (key) => JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)),
    set: (key, val) => localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)),
};

// ===== КОНФИГ ИСТОЧНИКОВ НОВОСТЕЙ =====
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
                published_at: item.pubDate || new Date().toISOString()
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
                published_at: item.pubDate || new Date().toISOString()
            }));
        },
        limit: 3
    },
    {
        name: 'Reddit CryptoCurrency',
        url: 'https://www.reddit.com/r/CryptoCurrency/.json?limit=6',
        parser: (data) => {
            if (!data || !data.data || !data.data.children) return [];
            return data.data.children.map(child => ({
                title: child.data.title,
                url: 'https://reddit.com' + child.data.permalink,
                source: { title: 'Reddit r/CryptoCurrency' },
                published_at: new Date(child.data.created_utc * 1000).toISOString()
            }));
        },
        limit: 4
    },
    {
        name: 'Reddit Bitcoin',
        url: 'https://www.reddit.com/r/Bitcoin/.json?limit=6',
        parser: (data) => {
            if (!data || !data.data || !data.data.children) return [];
            return data.data.children.map(child => ({
                title: child.data.title,
                url: 'https://reddit.com' + child.data.permalink,
                source: { title: 'Reddit r/Bitcoin' },
                published_at: new Date(child.data.created_utc * 1000).toISOString()
            }));
        },
        limit: 4
    }
];

// ===== ПЕРЕМЕННЫЕ ДЛЯ УВЕДОМЛЕНИЙ =====
let lastNewsTitles = [];
let notificationEnabled = false;

// ===== 1. ЗАГРУЗКА КРИПТОВАЛЮТ =====
async function loadCrypto() {
    const container = document.getElementById('cryptoContainer');
    container.innerHTML = Array(12).fill(0).map(() => 
        '<div class="skeleton" style="height:120px;border-radius:12px;"></div>'
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
                    <img src="${coin.image}" alt="${coin.name}" loading="lazy" />
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

// ===== 2. ЗАГРУЗКА НОВОСТЕЙ =====
async function loadNews() {
    const container = document.getElementById('newsContainer');
    container.innerHTML = Array(6).fill(0).map(() => 
        '<div class="skeleton" style="height:140px;border-radius:12px;"></div>'
    ).join('');

    let allNews = [];
    let newTitles = [];

    for (const source of NEWS_SOURCES) {
        try {
            console.log(`📡 Загружаем новости из: ${source.name}`);
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
                    sourceName: source.name
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

    // Проверяем новые новости для уведомлений
    newTitles = displayNews.map(item => item.title);
    checkNewNews(newTitles);

    container.innerHTML = '';
    for (const item of displayNews) {
        let titleRu = item.title || 'Новость';
        try {
            if (!/[а-яА-Я]/.test(titleRu)) {
                const translateRes = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(titleRu)}&langpair=en|ru`
                );
                const translateData = await translateRes.json();
                if (translateData.responseData && translateData.responseData.translatedText) {
                    titleRu = translateData.responseData.translatedText;
                }
            }
        } catch (e) {
            console.warn('Ошибка перевода:', e);
        }

        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="news-source">
                <i class="fas fa-globe"></i> 
                ${item.source?.title || item.sourceName || 'Unknown'}
                <span style="margin-left:auto;color:var(--text-secondary);font-size:11px;">
                    ${item.published_at ? new Date(item.published_at).toLocaleDateString('ru-RU') : 'Сегодня'}
                </span>
                <span class="source-badge">${item.sourceName || ''}</span>
            </div>
            <h3><a href="${item.url}" target="_blank" rel="noopener">${titleRu}</a></h3>
        `;
        container.appendChild(card);
    }

    // Отправляем в Telegram (3 новости)
    sendToTelegram(displayNews.slice(0, 3));
}

// ===== 3. ПРОВЕРКА НОВЫХ НОВОСТЕЙ ДЛЯ УВЕДОМЛЕНИЙ =====
function checkNewNews(newTitles) {
    if (lastNewsTitles.length === 0) {
        lastNewsTitles = newTitles;
        return;
    }

    const newItems = newTitles.filter(title => !lastNewsTitles.includes(title));
    
    if (newItems.length > 0 && notificationEnabled) {
        showNotification('📰', `Новая новость: ${newItems[0].substring(0, 60)}...`);
        
        // Отправляем Push-уведомление
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('CoinDigest — Новая новость!', {
                body: newItems[0].substring(0, 100) + '...',
                icon: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/svgs/solid/coins.svg'
            });
        }
    }

    lastNewsTitles = newTitles;
}

// ===== 4. УВЕДОМЛЕНИЕ НА САЙТЕ =====
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
    
    setTimeout(() => {
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

// ===== 5. ЗАПРОС РАЗРЕШЕНИЯ НА УВЕДОМЛЕНИЯ =====
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notificationEnabled = true;
                showNotification('🔔', 'Уведомления включены! Вы будете получать оповещения о новых новостях.');
            }
        });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        notificationEnabled = true;
    }
}

// ===== 6. TELEGRAM БОТ (С ВАШИМИ ДАННЫМИ!) =====
async function sendToTelegram(newsItems) {
    // 🔑 ВАШИ ДАННЫЕ (уже вставлены!)
    const BOT_TOKEN = '8422981212:AAFqUt5juqdC_l64q7FACOBw-mFL4f0hN8Y';
    const CHAT_ID = '8380652624';

    try {
        let message = '📰 *CoinDigest — Свежие новости*\n\n';
        newsItems.forEach((item, index) => {
            const title = item.title || 'Новость';
            const url = item.url || '#';
            message += `${index + 1}. [${title}](${url})\n`;
            message += `   📌 ${item.source?.title || item.sourceName || 'Unknown'}\n\n`;
        });
        message += `\n🔄 Обновлено: ${new Date().toLocaleString('ru-RU')}`;
        message += `\n🔗 Читать все новости: https://ваш-сайт.github.io/`;

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
            console.log('✅ Новости отправлены в Telegram');
        } else {
            console.error('❌ Ошибка Telegram:', result.description);
        }
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error);
    }
}

// ===== 7. ЭКСКЛЮЗИВНЫЕ МАТЕРИАЛЫ (АВТОМАТИЧЕСКИЙ СБОР) =====
async function loadExclusivePosts() {
    const container = document.getElementById('postsContainer');
    
    try {
        const response = await fetch('data/posts.json');
        let posts = await response.json();
        
        if (posts.length < 3) {
            const autoPosts = await fetchAutoPosts();
            posts = posts.concat(autoPosts);
        }
        
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
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Ошибка загрузки постов:', error);
        const autoPosts = await fetchAutoPosts();
        if (autoPosts.length > 0) {
            renderAutoPosts(autoPosts);
        }
    }
}

// ===== 8. АВТОМАТИЧЕСКИЙ СБОР МАТЕРИАЛОВ =====
async function fetchAutoPosts() {
    try {
        const sources = [
            'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/feed',
            'https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/feed'
        ];
        
        let posts = [];
        for (const url of sources) {
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.items) {
                const items = data.items.slice(0, 2).map(item => ({
                    title: item.title,
                    url: item.link,
                    content: item.description || 'Аналитический обзор крипторынка',
                    date: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                }));
                posts = posts.concat(items);
            }
        }
        return posts;
    } catch (error) {
        console.error('Ошибка автоматического сбора:', error);
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
            <p>${post.content ? post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '') : 'Аналитический обзор'}</p>
        `;
        container.appendChild(card);
    });
}

// ===== 9. ПЕРЕМЕШИВАНИЕ =====
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ===== 10. МОБИЛЬНОЕ МЕНЮ =====
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

    setTimeout(requestNotificationPermission, 3000);
});

// ===== 11. ЗАПУСК =====
loadCrypto();
loadNews();
loadExclusivePosts();

setInterval(() => {
    loadCrypto();
    loadNews();
}, 3600000);

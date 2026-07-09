// ===== ПРЕФИКС ДЛЯ LOCALSTORAGE (изоляция) =====
const STORAGE_PREFIX = 'coindigest_';
const LS = {
    get: (key) => JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)),
    set: (key, val) => localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)),
};

// ===== КОНФИГ ИСТОЧНИКОВ НОВОСТЕЙ =====
const NEWS_SOURCES = [
    {
        name: 'CryptoPanic',
        url: 'https://cryptopanic.com/api/v1/posts/?auth_token=YOUR_API_KEY&public=true&filter=hot',
        parser: (data) => data.results || [],
        limit: 4
    },
    {
        name: 'NewsAPI',
        url: 'https://newsapi.org/v2/everything?q=cryptocurrency&language=en&pageSize=4&apiKey=YOUR_NEWSAPI_KEY',
        parser: (data) => data.articles || [],
        limit: 4
    },
    {
        name: 'Reddit',
        url: 'https://www.reddit.com/r/CryptoCurrency/.json?limit=4',
        parser: (data) => data.data.children.map(child => ({
            title: child.data.title,
            url: 'https://reddit.com' + child.data.permalink,
            source: { title: 'Reddit' },
            published_at: new Date(child.data.created_utc * 1000).toISOString()
        })),
        limit: 4
    }
];

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
                    ${item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Сегодня'}
                </span>
                <span class="source-badge">${item.sourceName || ''}</span>
            </div>
            <h3><a href="${item.url}" target="_blank" rel="noopener">${titleRu}</a></h3>
            ${item.currencies ? `<div class="news-tags">${item.currencies.map(c => c.code).join(', ')}</div>` : ''}
        `;
        container.appendChild(card);
    }

    const info = document.createElement('p');
    info.style.cssText = 'color:var(--text-secondary);font-size:12px;margin-top:12px;grid-column:1/-1;text-align:center;';
    info.textContent = `📊 Загружено ${allNews.length} новостей из ${NEWS_SOURCES.length} источников`;
    container.appendChild(info);
}

// ===== 3. ПЕРЕМЕШИВАНИЕ =====
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ===== 4. ЗАГРУЗКА ПОСТОВ =====
async function loadPosts() {
    const container = document.getElementById('postsContainer');
    
    try {
        const response = await fetch('data/posts.json');
        const posts = await response.json();
        container.innerHTML = '';

        if (posts.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;">Пока нет постов</p>';
            return;
        }

        posts.slice().reverse().forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <h3>${post.title}</h3>
                <div class="date">${post.date}</div>
                <p>${post.content.substring(0, 120)}${post.content.length > 120 ? '...' : ''}</p>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = '<p style="color:var(--red);grid-column:1/-1;text-align:center;">⚠️ Не удалось загрузить посты</p>';
        console.error('Ошибка загрузки постов:', error);
    }
}

// ===== 5. МОБИЛЬНОЕ МЕНЮ =====
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
});

// ===== 6. ЗАПУСК =====
loadCrypto();
loadNews();
loadPosts();

// Автообновление раз в час
setInterval(() => {
    loadCrypto();
    loadNews();
}, 3600000);

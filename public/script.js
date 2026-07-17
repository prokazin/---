// === TELEGRAM MINI APP ===
let tgApp = null;
try {
    if (window.Telegram && window.Telegram.WebApp) {
        tgApp = window.Telegram.WebApp;
        tgApp.ready();
        console.log('✅ Telegram Mini App инициализирован');
    }
} catch (e) {}

// === ЗАГРУЗКА КРИПТОВАЛЮТ ===
async function loadCrypto() {
    const container = document.getElementById('cryptoContainer');
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false');
        const data = await response.json();
        container.innerHTML = '';
        data.forEach(coin => {
            const change = coin.price_change_percentage_24h || 0;
            const cls = change >= 0 ? 'positive' : 'negative';
            const sign = change >= 0 ? '+' : '';
            container.innerHTML += `
                <div class="crypto-card">
                    <div class="name">
                        <img src="${coin.image}" alt="${coin.name}" />
                        ${coin.name}
                        <span class="symbol">${coin.symbol.toUpperCase()}</span>
                    </div>
                    <div class="price">$${coin.current_price.toLocaleString()}</div>
                    <div class="change ${cls}">${sign}${change.toFixed(2)}%</div>
                </div>
            `;
        });
        document.getElementById('updateTime').textContent = 'Обновление: ' + new Date().toLocaleTimeString();
    } catch (e) {
        container.innerHTML = '<p class="skeleton">⚠️ Не удалось загрузить данные</p>';
    }
}

// === ЗАГРУЗКА НОВОСТЕЙ ===
async function loadNews() {
    const container = document.getElementById('newsContainer');
    try {
        const response = await fetch('/api/news');
        const data = await response.json();
        if (data.news && data.news.length > 0) {
            container.innerHTML = '';
            data.news.slice(0, 6).forEach(item => {
                container.innerHTML += `
                    <div class="news-card">
                        <div class="source">${item.source} • ${new Date(item.published_at).toLocaleDateString('ru-RU')}</div>
                        <h3><a href="${item.url}" target="_blank">${item.title}</a></h3>
                        <span class="badge">Новость</span>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p class="skeleton">Новостей пока нет</p>';
        }
    } catch (e) {
        container.innerHTML = '<p class="skeleton">⚠️ Не удалось загрузить новости</p>';
    }
}

// === ВКЛАДКИ ===
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = {
        main: document.getElementById('tabMain'),
        news: document.getElementById('tabNews'),
        calendar: document.getElementById('tabCalendar')
    };
    const mobileLinks = document.querySelectorAll('.mobile-menu a');
    
    function switchTab(name) {
        Object.keys(contents).forEach(key => {
            contents[key].classList.toggle('active', key === name);
        });
        tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
        mobileLinks.forEach(link => link.classList.toggle('active', link.dataset.tab === name));
        
        if (name === 'main') { loadCrypto(); loadPosts(); }
        else if (name === 'news') { loadNews(); }
        else if (name === 'calendar') { loadCalendar(); }
    }
    
    tabs.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    mobileLinks.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.dataset.tab);
        document.getElementById('mobileMenu').classList.remove('open');
    }));
    
    switchTab('main');
}

// === МОБИЛЬНОЕ МЕНЮ ===
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('open');
});

// === ЗАПУСК ===
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadCrypto();
    loadPosts();
    loadCalendar();
});

// === ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ ===
setInterval(() => { loadCrypto(); }, 60000);

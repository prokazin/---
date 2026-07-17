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
    if (!container) return;
    
    container.innerHTML = '<div class="skeleton">Загрузка...</div>';
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false');
        if (!response.ok) throw new Error('HTTP ' + response.status);
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
                    <div class="price">$${coin.current_price ? coin.current_price.toLocaleString() : '0'}</div>
                    <div class="change ${cls}">${sign}${change.toFixed(2)}%</div>
                </div>
            `;
        });
        document.getElementById('updateTime').textContent = 'Обновление: ' + new Date().toLocaleTimeString();
    } catch (e) {
        container.innerHTML = '<p class="skeleton">⚠️ Не удалось загрузить данные</p>';
        console.error('Ошибка загрузки криптовалют:', e);
    }
}

// === ЗАГРУЗКА НОВОСТЕЙ (С ВЕРСЕЛЯ) ===
async function loadNews() {
    const container = document.getElementById('newsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="skeleton">Загрузка новостей...</div>';
    try {
        const response = await fetch('/api/news');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        
        if (data.success && data.newsCount > 0) {
            // Если API вернул новости — показываем их
            const newsResponse = await fetch('/api/news');
            const newsData = await newsResponse.json();
            // Загружаем новости с сайта
            const newsList = await loadNewsFromApi();
            if (newsList && newsList.length > 0) {
                container.innerHTML = '';
                newsList.slice(0, 6).forEach(item => {
                    container.innerHTML += `
                        <div class="news-card">
                            <div class="source">${item.source || 'Unknown'} • ${item.published_at ? new Date(item.published_at).toLocaleDateString('ru-RU') : ''}</div>
                            <h3><a href="${item.url}" target="_blank">${item.title}</a></h3>
                            <span class="badge">Новость</span>
                        </div>
                    `;
                });
            } else {
                container.innerHTML = '<p class="skeleton">Новостей пока нет</p>';
            }
        } else {
            container.innerHTML = '<p class="skeleton">Новостей пока нет</p>';
        }
    } catch (e) {
        container.innerHTML = '<p class="skeleton">⚠️ Не удалось загрузить новости</p>';
        console.error('Ошибка загрузки новостей:', e);
    }
}

// === ЗАГРУЗКА НОВОСТЕЙ С API ===
async function loadNewsFromApi() {
    try {
        const response = await fetch('/api/news');
        const data = await response.json();
        // Если есть результат — возвращаем новости
        if (data.success) {
            // Получаем новости с сервера
            const newsData = await fetch('/api/news');
            const result = await newsData.json();
            return result.news || [];
        }
        return [];
    } catch (e) {
        console.error('Ошибка загрузки новостей с API:', e);
        return [];
    }
}

// === ЗАГРУЗКА КАЛЕНДАРЯ ===
async function loadCalendar() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="skeleton">Загрузка событий...</div>';
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/events?page=1');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
            const events = data.data.slice(0, 10);
            container.innerHTML = '';
            events.forEach(event => {
                const date = new Date(event.event_date);
                const day = date.getDate().toString().padStart(2, '0');
                const month = date.toLocaleString('ru', { month: 'short' });
                let icon = '📅';
                const type = (event.type || '').toLowerCase();
                if (type.includes('conference')) icon = '🎤';
                else if (type.includes('fork')) icon = '🔧';
                else if (type.includes('sale')) icon = '💰';
                else if (type.includes('launch')) icon = '🚀';
                else if (type.includes('deadline')) icon = '⏰';
                
                container.innerHTML += `
                    <div class="calendar-event">
                        <div class="date">
                            ${day}
                            <span class="month">${month}</span>
                        </div>
                        <div class="icon">${icon}</div>
                        <div class="info">
                            <div class="title">${event.name || 'Событие'}</div>
                            ${event.description ? `<div class="desc">${event.description.substring(0, 120)}...</div>` : ''}
                            <span class="tag">${event.type || 'Событие'}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p class="skeleton">Нет предстоящих событий</p>';
        }
    } catch (e) {
        container.innerHTML = '<p class="skeleton">⚠️ Не удалось загрузить события</p>';
        console.error('Ошибка загрузки календаря:', e);
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
            if (contents[key]) contents[key].classList.toggle('active', key === name);
        });
        tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
        mobileLinks.forEach(link => link.classList.toggle('active', link.dataset.tab === name));
        
        if (name === 'main') { loadCrypto(); }
        else if (name === 'news') { loadNews(); }
        else if (name === 'calendar') { loadCalendar(); }
    }
    
    tabs.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    mobileLinks.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.dataset.tab);
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) mobileMenu.classList.remove('open');
    }));
    
    switchTab('main');
}

// === МОБИЛЬНОЕ МЕНЮ ===
const menuBtn = document.getElementById('mobileMenuBtn');
if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.toggle('open');
    });
}

// === ЗАПУСК ===
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadCrypto();
});

// === ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ ===
setInterval(() => { loadCrypto(); }, 60000);

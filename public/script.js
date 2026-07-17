// ============================================
// ===== TELEGRAM MINI APP =====
// ============================================

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

// ============================================
// ===== ПРЕФИКС ДЛЯ LOCALSTORAGE =====
// ============================================

const STORAGE_PREFIX = 'coindigest_';
const LS = {
    get: (key) => JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)),
    set: (key, val) => localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)),
};

// ============================================
// ===== ПЕРЕМЕННЫЕ =====
// ============================================

let notificationEnabled = false;
let pendingNotification = null;
let adInterval = null;
let currentAdIndex = 0;

// ============================================
// ===== ЗАГРУЗКА КРИПТОВАЛЮТ =====
// ============================================

async function loadCrypto() {
    const container = document.getElementById('cryptoContainer');
    if (!container) return;
    
    container.innerHTML = Array(12).fill(0).map(() =>
        '<div class="skeleton" style="height:clamp(100px, 12vw, 120px);border-radius:12px;">Загрузка...</div>'
    ).join('');

    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false'
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        container.innerHTML = '';

        data.forEach(coin => {
            const change = coin.price_change_percentage_24h || 0;
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
                <div class="price">$${coin.current_price ? coin.current_price.toLocaleString() : '0'}</div>
                <div class="change ${changeClass}">${changeSign}${change.toFixed(2)}%</div>
            `;
            container.appendChild(card);
        });

        document.getElementById('updateTime').textContent =
            'Обновление: ' + new Date().toLocaleTimeString();

    } catch (error) {
        console.error('Ошибка загрузки криптовалют:', error);
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--red);">
                ⚠️ Не удалось загрузить данные
            </div>
        `;
    }
}

// ============================================
// ===== ЗАГРУЗКА НОВОСТЕЙ =====
// ============================================

async function loadNews() {
    const container = document.getElementById('newsContainer');
    if (!container) return;

    container.innerHTML = Array(6).fill(0).map(() =>
        '<div class="skeleton" style="height:clamp(120px, 15vw, 150px);border-radius:12px;">Загрузка новостей...</div>'
    ).join('');

    try {
        // Загружаем новости с Vercel API
        const response = await fetch('/api/news');
        const data = await response.json();

        if (!data.success || !data.news || data.news.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-secondary);">Новостей пока нет</div>';
            return;
        }

        container.innerHTML = '';
        const newsItems = data.news.slice(0, 6);
        
        for (const item of newsItems) {
            const card = document.createElement('div');
            card.className = 'news-card';
            
            const date = item.published_at ? new Date(item.published_at).toLocaleDateString('ru-RU') : 'Сегодня';
            
            card.innerHTML = `
                <div class="source">
                    <span>📌 ${item.source || 'Unknown'}</span>
                    <span class="badge">Новость</span>
                </div>
                <h3><a href="${item.url}" target="_blank" rel="noopener">${item.title}</a></h3>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">📅 ${date}</div>
            `;
            container.appendChild(card);
        }

    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--red);">
                ⚠️ Не удалось загрузить новости
            </div>
        `;
    }
}

// ============================================
// ===== ЗАГРУЗКА ЭКСКЛЮЗИВНЫХ МАТЕРИАЛОВ =====
// ============================================

async function loadExclusivePosts() {
    const container = document.getElementById('postsContainer');
    if (!container) return;

    try {
        const response = await fetch('data/posts.json');
        let posts = await response.json();

        if (!posts || posts.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-secondary);">Материалы загружаются...</div>';
            return;
        }

        container.innerHTML = '';
        posts.slice().reverse().forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <h3>${post.url ? `<a href="${post.url}" target="_blank">${post.title}</a>` : post.title}</h3>
                <div class="date">${post.date}</div>
                <p>${post.content ? post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '') : ''}</p>
                ${post.isExclusive ? '<span class="exclusive-badge">⭐ ЭКСКЛЮЗИВ</span>' : ''}
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Ошибка загрузки постов:', error);
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-secondary);">
                Материалы загружаются...
            </div>
        `;
    }
}

// ============================================
// ===== ЗАГРУЗКА КАЛЕНДАРЯ =====
// ============================================

async function loadCalendar() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;

    container.innerHTML = '<div class="skeleton" style="padding:20px;">Загрузка событий...</div>';

    try {
        const response = await fetch('https://api.coingecko.com/api/v3/events?page=1');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();

        if (!data || !data.data || data.data.length === 0) {
            container.innerHTML = `
                <div class="calendar-empty">
                    <i class="fas fa-calendar-times"></i>
                    <p>Нет предстоящих событий</p>
                </div>
            `;
            return;
        }

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
            else if (type.includes('sale') || type.includes('token')) icon = '💰';
            else if (type.includes('launch')) icon = '🚀';
            else if (type.includes('deadline')) icon = '⏰';
            else if (type.includes('update') || type.includes('upgrade')) icon = '⚙️';

            const card = document.createElement('div');
            card.className = 'calendar-event';
            card.innerHTML = `
                <div class="event-date">
                    ${day}
                    <span class="month">${month}</span>
                </div>
                <div class="event-icon">${icon}</div>
                <div class="event-info">
                    <div class="event-title">${event.name || 'Событие'}</div>
                    ${event.description ? `<div class="event-desc">${event.description.substring(0, 120)}...</div>` : ''}
                    <span class="event-tag">${event.type || 'Событие'}</span>
                    ${event.coins && event.coins.length > 0 ? ` <span class="event-tag" style="background:rgba(14,203,129,0.12);color:#0ecb81;">${event.coins.map(c => c.symbol.toUpperCase()).join(', ')}</span>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Ошибка загрузки календаря:', error);
        container.innerHTML = `
            <div class="calendar-empty">
                <i class="fas fa-exclamation-triangle" style="color:var(--red);"></i>
                <p>Не удалось загрузить события</p>
                <button onclick="loadCalendar()" style="margin-top:12px;padding:8px 20px;background:var(--accent);border:none;border-radius:8px;color:#0b0e11;font-weight:600;cursor:pointer;">Повторить</button>
            </div>
        `;
    }
}

// ============================================
// ===== РЕКЛАМА =====
// ============================================

function loadAd() {
    const container = document.getElementById('adContainer');
    if (!container) return;

    const ads = LS.get('ads') || [];

    if (!ads || ads.length === 0) {
        container.innerHTML = '';
        return;
    }

    if (currentAdIndex >= ads.length) {
        currentAdIndex = 0;
    }

    showAd(ads, currentAdIndex);

    if (adInterval) clearInterval(adInterval);
    adInterval = setInterval(() => {
        const adsNow = LS.get('ads') || [];
        if (adsNow.length === 0) {
            container.innerHTML = '';
            return;
        }
        currentAdIndex = (currentAdIndex + 1) % adsNow.length;
        showAd(adsNow, currentAdIndex);
    }, 30000);
}

function showAd(ads, index) {
    const container = document.getElementById('adContainer');
    if (!container) return;

    const ad = ads[index];
    if (!ad) {
        container.innerHTML = '';
        return;
    }

    let html = '<div style="text-align:center;">';

    if (ad.type === 'image' || ad.type === 'gif') {
        html += `<img src="${ad.url}" alt="${ad.name || 'Реклама'}" loading="lazy" style="max-width:100%;max-height:160px;border-radius:8px;" />`;
        if (ad.text) {
            html += `<div style="margin-top:6px;font-size:14px;color:var(--text-secondary);">${ad.text}</div>`;
        }
        if (ad.link) {
            html += `<div style="margin-top:4px;"><a href="${ad.link}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;font-weight:500;">Подробнее</a></div>`;
        }
    } else if (ad.type === 'video') {
        html += `<video controls autoplay muted loop style="max-width:100%;max-height:160px;border-radius:8px;">
                    <source src="${ad.url}" type="video/mp4">
                    Ваш браузер не поддерживает видео
                </video>`;
        if (ad.text) {
            html += `<div style="margin-top:6px;font-size:14px;color:var(--text-secondary);">${ad.text}</div>`;
        }
        if (ad.link) {
            html += `<div style="margin-top:4px;"><a href="${ad.link}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;font-weight:500;">Подробнее</a></div>`;
        }
    } else if (ad.type === 'link') {
        html += `<a href="${ad.link}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 28px;background:var(--accent);color:#0b0e11;border-radius:8px;font-weight:600;text-decoration:none;">
                    ${ad.text || 'Перейти по ссылке'}
                </a>`;
    } else if (ad.type === 'html') {
        html += ad.text;
    }

    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// ===== ВКЛАДКИ =====
// ============================================

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const mobileLinks = document.querySelectorAll('.mobile-menu a');
    const tabContents = {
        main: document.getElementById('tabMain'),
        news: document.getElementById('tabNews'),
        calendar: document.getElementById('tabCalendar')
    };

    function switchTab(tabName) {
        // Скрываем все
        Object.values(tabContents).forEach(el => {
            if (el) el.classList.remove('active');
        });

        // Показываем нужную
        if (tabContents[tabName]) {
            tabContents[tabName].classList.add('active');
        }

        // Обновляем кнопки
        document.querySelectorAll('.tab-btn, .mobile-menu a').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === tabName);
        });

        // Загружаем данные
        if (tabName === 'main') {
            loadCrypto();
            loadExclusivePosts();
        } else if (tabName === 'news') {
            loadNews();
        } else if (tabName === 'calendar') {
            loadCalendar();
        }
    }

    tabs.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.tab);
            document.getElementById('mobileMenu').classList.remove('open');
        });
    });

    // Загружаем главную вкладку
    switchTab('main');
}

// ============================================
// ===== МОБИЛЬНОЕ МЕНЮ =====
// ============================================

document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('open');
});

// ============================================
// ===== ЗАПРОС УВЕДОМЛЕНИЙ =====
// ============================================

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notificationEnabled = true;
                console.log('✅ Уведомления включены');
            }
        });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        notificationEnabled = true;
    }
}

// ============================================
// ===== ЗАПУСК =====
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    setupTabs();
    loadAd();
    setTimeout(requestNotificationPermission, 3000);
});

// Автообновление каждые 60 минут
setInterval(() => {
    loadCrypto();
}, 3600000);

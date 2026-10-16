// ============================================
// CoinDigest — клиентская логика (Релиз 1)
// ============================================

const API = '/api/news?secret=coindigest_2026';
const AI_API = '/api/ai?secret=coindigest_2026';
const LS_PREFIX = 'coindigest_';
const LS = {
    get: (k, fallback = null) => {
        try { return JSON.parse(localStorage.getItem(LS_PREFIX + k)) ?? fallback; }
        catch { return fallback; }
    },
    set: (k, v) => localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)),
};

// Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

// ============================================
// СОСТОЯНИЕ
// ============================================

const state = {
    page: 'home',
    news: [],          // все новости (дедуплицированные)
    newsFiltered: [],
    newsRendered: 0,   // сколько показано
    newsPageSize: 10,
    marketCoins: [],
    marketFilter: '100',
    marketSearch: '',
    marketSort: { field: 'cap', dir: 'desc' },
    newsFilter: 'all',
    newsSearch: '',
    calendar: [],
    calendarPeriod: 'today',
    savedNews: LS.get('savedNews', []),
    readNews: LS.get('readNews', []),
    ads: LS.get('ads', []),
};

// ============================================
// НАВИГАЦИЯ
// ============================================

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.goto));
});

function switchPage(page) {
    state.page = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page)?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.page === page);
    });
    if (page === 'market' && state.marketCoins.length === 0) loadMarket();
    if (page === 'news' && state.news.length === 0) loadNews();
    if (page === 'calendar' && state.calendar.length === 0) loadCalendar();
}

// ============================================
// ГЛАВНАЯ — ТРЕНД РЫНКА
// ============================================

async function loadTrend() {
    const card = document.getElementById('trendCard');
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/global');
        const d = await r.json();
        const btcDominance = d.data?.market_cap_percentage?.btc || 0;
        const capChange = d.data?.market_cap_change_percentage_24h_usd || 0;

        let trend, emoji, desc;
        if (capChange > 2) {
            trend = 'bull'; emoji = '🐂';
            desc = `Рынок растёт на ${capChange.toFixed(1)}% за сутки. BTC доминация: ${btcDominance.toFixed(1)}%.`;
        } else if (capChange < -2) {
            trend = 'bear'; emoji = '🐻';
            desc = `Рынок падает на ${Math.abs(capChange).toFixed(1)}% за сутки. BTC доминация: ${btcDominance.toFixed(1)}%.`;
        } else {
            trend = 'neutral'; emoji = '⚖️';
            desc = `Боковое движение. Изменение за 24ч: ${capChange > 0 ? '+' : ''}${capChange.toFixed(1)}%. BTC доминация: ${btcDominance.toFixed(1)}%.`;
        }

        const title = trend === 'bull' ? 'Бычий тренд' : trend === 'bear' ? 'Медвежий тренд' : 'Нейтральный тренд';

        card.className = 'card trend-card ' + trend;
        card.innerHTML = `
            <div class="trend-emoji">${emoji}</div>
            <div class="trend-info">
                <div class="trend-title">${title}</div>
                <div class="trend-desc">${desc}</div>
            </div>
        `;
    } catch (e) {
        card.innerHTML = `<div class="trend-info"><div class="trend-desc">Не удалось загрузить данные</div></div>`;
    }
}

// ============================================
// ГЛАВНАЯ — ТОП-5 МОНЕТ С СПАРКЛАЙНАМИ
// ============================================

async function loadTopCoins() {
    const wrap = document.getElementById('topCoins');
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=true&price_change_percentage=24h');
        const data = await r.json();
        if (!Array.isArray(data) || !data.length) throw new Error('empty');

        wrap.innerHTML = '';
        data.forEach(coin => {
            const change = coin.price_change_percentage_24h || 0;
            const changeClass = change >= 0 ? 'up' : 'down';
            const sign = change >= 0 ? '+' : '';
            const spark = buildSparkline(coin.sparkline_in_7d?.price || [], change >= 0);

            const div = document.createElement('div');
            div.className = 'top-coin';
            div.innerHTML = `
                <img src="${coin.image}" alt="${coin.symbol}">
                <div class="top-coin-info">
                    <div class="top-coin-symbol">${coin.symbol.toUpperCase()}</div>
                    <div class="top-coin-name">${coin.name}</div>
                </div>
                <div class="top-coin-spark">${spark}</div>
                <div class="top-coin-price">
                    <div class="top-coin-price-val">$${formatPrice(coin.current_price)}</div>
                    <div class="top-coin-change ${changeClass}">${sign}${change.toFixed(2)}%</div>
                </div>
            `;
            wrap.appendChild(div);
        });
    } catch (e) {
        wrap.innerHTML = '<div class="trend-desc">Не удалось загрузить монеты</div>';
    }
}

function buildSparkline(prices, up) {
    if (!prices || prices.length < 2) return '';
    const w = 60, h = 24;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const step = w / (prices.length - 1);
    const points = prices.map((p, i) => `${(i * step).toFixed(1)},${(h - ((p - min) / range) * h).toFixed(1)}`).join(' ');
    const color = up ? '#0ECB81' : '#F6465D';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ============================================
// ГЛАВНАЯ — СОБЫТИЯ ДНЯ
// ============================================

async function loadEventsToday() {
    const wrap = document.getElementById('eventsToday');
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/events?page=1');
        const d = await r.json();
        const events = (d.data || []).slice(0, 3);
        if (!events.length) { wrap.innerHTML = '<div class="event-meta">Событий нет</div>'; return; }

        wrap.innerHTML = '';
        events.forEach(ev => {
            const dt = new Date(ev.event_date);
            const day = String(dt.getDate()).padStart(2, '0');
            const month = dt.toLocaleString('ru', { month: 'short' });
            const div = document.createElement('div');
            div.className = 'event-item';
            div.innerHTML = `
                <div class="event-date">
                    <div class="event-day">${day}</div>
                    <div class="event-month">${month}</div>
                </div>
                <div class="event-body">
                    <div class="event-title">${ev.name || 'Событие'}</div>
                    <div class="event-meta">${ev.type || ''}</div>
                </div>
            `;
            wrap.appendChild(div);
        });
    } catch (e) {
        wrap.innerHTML = '<div class="event-meta">Не удалось загрузить</div>';
    }
}

// ============================================
// ГЛАВНАЯ — ПОЧЕМУ ЭТО ВАЖНО (AI)
// ============================================

async function loadWhyImportant() {
    const wrap = document.getElementById('whyContent');
    try {
        const r = await fetch(API + '&mode=list');
        const d = await r.json();
        const news = (d.news || []).slice(0, 2);
        if (!news.length) { wrap.innerHTML = '<div class="event-meta">Новостей нет</div>'; return; }

        let html = '';
        news.forEach(n => {
            html += `
                <div class="why-item">
                    <div class="why-item-title"><a href="${n.url}" target="_blank">${truncate(n.title, 90)}</a></div>
                    <div class="why-item-source">${n.source}</div>
                </div>
            `;
        });

        // AI-вывод
        try {
            const aiText = await getAIComment(news.map(n => n.title));
            if (aiText) {
                html += `
                    <div class="why-ai">
                        <div class="why-ai-title"><i class="fas fa-robot"></i> AI-вывод</div>
                        <div>${aiText}</div>
                    </div>
                `;
            }
        } catch (e) { /* молча */ }

        wrap.innerHTML = html;
    } catch (e) {
        wrap.innerHTML = '<div class="event-meta">Не удалось загрузить</div>';
    }
}

async function getAIComment(titles) {
    if (!titles || !titles.length) return '';
    const q = encodeURIComponent(titles.join(' | '));
    const r = await fetch(`${AI_API}&q=${q}`);
    const d = await r.json();
    return d.text || '';
}

// ============================================
// РЫНОК — ТАБЛИЦА
// ============================================

async function loadMarket() {
    const tbody = document.getElementById('marketBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Загрузка...</td></tr>';

    try {
        const perPage = state.marketFilter === '100' ? 100 : state.marketFilter === '500' ? 250 : 250;
        const pages = state.marketFilter === '100' ? 1 : state.marketFilter === '500' ? 2 : 10;
        let all = [];
        for (let i = 1; i <= pages; i++) {
            const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${i}&sparkline=false&price_change_percentage=24h,7d`);
            const d = await r.json();
            if (!Array.isArray(d) || !d.length) break;
            all = all.concat(d);
        }
        state.marketCoins = all;
        renderMarket();
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Ошибка загрузки</td></tr>';
    }
}

function renderMarket() {
    const tbody = document.getElementById('marketBody');
    let coins = [...state.marketCoins];

    if (state.marketSearch) {
        const q = state.marketSearch.toLowerCase();
        coins = coins.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
    }

    const sf = state.marketSort.field;
    const dir = state.marketSort.dir === 'asc' ? 1 : -1;
    coins.sort((a, b) => {
        let av, bv;
        if (sf === 'name') { av = a.name; bv = b.name; return av.localeCompare(bv) * dir; }
        if (sf === 'price') { av = a.current_price || 0; bv = b.current_price || 0; }
        if (sf === 'change24') { av = a.price_change_percentage_24h || 0; bv = b.price_change_percentage_24h || 0; }
        if (sf === 'change7') { av = a.price_change_percentage_7d_in_currency || 0; bv = b.price_change_percentage_7d_in_currency || 0; }
        if (sf === 'cap') { av = a.market_cap || 0; bv = b.market_cap || 0; }
        if (sf === 'volume') { av = a.total_volume || 0; bv = b.total_volume || 0; }
        return (av - bv) * dir;
    });

    if (!coins.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Ничего не найдено</td></tr>';
        return;
    }

    const frag = document.createDocumentFragment();
    coins.slice(0, 500).forEach(c => {
        const c24 = c.price_change_percentage_24h || 0;
        const c7 = c.price_change_percentage_7d_in_currency || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="market-coin">
                    <img src="${c.image}" alt="${c.symbol}">
                    <div>
                        <div class="market-coin-name">${c.name}</div>
                        <div class="market-coin-symbol">${c.symbol}</div>
                    </div>
                </div>
            </td>
            <td class="num">$${formatPrice(c.current_price)}</td>
            <td class="num ${c24 >= 0 ? 'up' : 'down'}">${c24 >= 0 ? '+' : ''}${c24.toFixed(2)}%</td>
            <td class="num ${c7 >= 0 ? 'up' : 'down'}">${c7 >= 0 ? '+' : ''}${c7.toFixed(2)}%</td>
            <td class="num">${formatBigNum(c.market_cap)}</td>
            <td class="num">${formatBigNum(c.total_volume)}</td>
            <td><button class="market-add" data-add="${c.id}" title="В портфель"><i class="fas fa-plus"></i></button></td>
        `;
        frag.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(frag);

    // Обработка кнопок "+ портфель" (заглушка для Релиза 2)
    tbody.querySelectorAll('[data-add]').forEach(btn => {
        btn.addEventListener('click', () => {
            toast('Портфель появится в следующем обновлении');
        });
    });
}

// Сортировка
document.querySelectorAll('.market-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (state.marketSort.field === field) {
            state.marketSort.dir = state.marketSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            state.marketSort.field = field;
            state.marketSort.dir = 'desc';
        }
        document.querySelectorAll('.market-table th').forEach(x => x.classList.remove('sort-asc', 'sort-desc'));
        th.classList.add(state.marketSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
        renderMarket();
    });
});

// Поиск и фильтр рынка
document.getElementById('marketSearch')?.addEventListener('input', e => {
    state.marketSearch = e.target.value.trim();
    renderMarket();
});

document.querySelectorAll('#marketFilter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#marketFilter .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.marketFilter = btn.dataset.limit;
        loadMarket();
    });
});

// ============================================
// НОВОСТИ — ЗАГРУЗКА + ДЕДУПЛИКАЦИЯ
// ============================================

async function loadNews() {
    const list = document.getElementById('newsList');
    list.innerHTML = '<div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div>';
    try {
        const r = await fetch(API + '&mode=list');
        const d = await r.json();
        state.news = deduplicateNews(d.news || []);
        applyNewsFilters();
    } catch (e) {
        list.innerHTML = '<div class="event-meta">Ошибка загрузки</div>';
    }
}

// Дедупликация: похожие заголовки — одна карточка со списком источников
function deduplicateNews(news) {
    const groups = [];
    news.forEach(item => {
        const key = normalizeTitle(item.title);
        const existing = groups.find(g => similarity(g.key, key) > 0.75);
        if (existing) {
            existing.sources.push(item.source);
            if (!existing.url) existing.url = item.url;
        } else {
            groups.push({
                key,
                title: item.title,
                url: item.url,
                sources: [item.source],
                published_at: item.published_at,
            });
        }
    });
    return groups.map(g => ({
        ...g,
        sources: [...new Set(g.sources)],
        isImportant: isImportantNews(g.title, g.sources),
    }));
}

function normalizeTitle(t) {
    return (t || '').toLowerCase().replace(/[^\wа-яё\s]/gi, '').replace(/\s+/g, ' ').trim();
}

function similarity(a, b) {
    const setA = new Set(a.split(' ').filter(w => w.length > 3));
    const setB = new Set(b.split(' ').filter(w => w.length > 3));
    if (!setA.size || !setB.size) return 0;
    const inter = [...setA].filter(w => setB.has(w)).length;
    return inter / Math.min(setA.size, setB.size);
}

function isImportantNews(title, sources) {
    if (sources.length >= 2) return true;
    const t = (title || '').toLowerCase();
    const keywords = ['sec ', 'etf', 'hack', 'hacked', 'crash', 'regulation', 'fed ', 'rate cut', 'rate hike', 'ban', 'lawsuit', 'surge', 'plunge', 'whale', 'blackrock', 'binance'];
    return keywords.some(k => t.includes(k));
}

// ============================================
// НОВОСТИ — ФИЛЬТРЫ И РЕНДЕР
// ============================================

document.querySelectorAll('#newsFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#newsFilters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.newsFilter = btn.dataset.filter;
        applyNewsFilters();
    });
});

document.getElementById('newsSearch')?.addEventListener('input', e => {
    state.newsSearch = e.target.value.trim().toLowerCase();
    applyNewsFilters();
});

function applyNewsFilters() {
    let list = [...state.news];
    if (state.newsFilter === 'important') list = list.filter(n => n.isImportant);
    if (state.newsFilter === 'saved') list = list.filter(n => state.savedNews.includes(n.title));
    if (state.newsSearch) list = list.filter(n => n.title.toLowerCase().includes(state.newsSearch));
    state.newsFiltered = list;
    state.newsRendered = 0;
    renderNews(true);
}

function renderNews(reset = false) {
    const wrap = document.getElementById('newsList');
    if (reset) wrap.innerHTML = '';

    const start = state.newsRendered;
    const end = start + state.newsPageSize;
    const slice = state.newsFiltered.slice(start, end);

    slice.forEach((n, i) => {
        const globalIndex = start + i;
        // Реклама после 5-й карточки
        if (globalIndex === 5 && state.ads.length > 0) {
            wrap.appendChild(buildAd());
        }
        wrap.appendChild(buildNewsCard(n));
    });

    state.newsRendered = end;

    const btn = document.getElementById('loadMoreNews');
    btn.disabled = state.newsRendered >= state.newsFiltered.length;
    btn.textContent = btn.disabled ? 'Больше нет новостей' : 'Показать ещё';
    btn.style.display = state.newsFiltered.length <= state.newsPageSize ? 'none' : 'inline-block';
}

function buildNewsCard(n) {
    const isRead = state.readNews.includes(n.title);
    const isSaved = state.savedNews.includes(n.title);
    const sourcesText = n.sources.length > 1
        ? `Источники: ${n.sources.join(', ')}`
        : n.sources[0] || '';

    const card = document.createElement('div');
    card.className = 'news-card' + (n.isImportant ? ' important' : '') + (isRead ? ' read' : '');
    card.innerHTML = `
        <div class="news-sources">
            ${n.sources.map(s => `<span class="news-source-badge">${s}</span>`).join('')}
            ${n.isImportant ? '<span class="news-source-badge" style="background:rgba(246,70,93,0.15);color:#F6465D;">🔥 Важное</span>' : ''}
        </div>
        <div class="news-title"><a href="${n.url}" target="_blank" rel="noopener" data-link>${n.title}</a></div>
        <div class="news-meta">
            <span>${sourcesText}</span>
            <div class="news-actions">
                <button class="news-action-btn ${isSaved ? 'active' : ''}" data-save title="Сохранить"><i class="fas fa-star"></i></button>
                <button class="news-action-btn" data-share title="Поделиться"><i class="fas fa-share-alt"></i></button>
            </div>
        </div>
    `;

    card.querySelector('[data-link]')?.addEventListener('click', () => {
        if (!state.readNews.includes(n.title)) {
            state.readNews.push(n.title);
            LS.set('readNews', state.readNews);
            card.classList.add('read');
        }
    });

    card.querySelector('[data-save]')?.addEventListener('click', e => {
        e.stopPropagation();
        const idx = state.savedNews.indexOf(n.title);
        if (idx >= 0) {
            state.savedNews.splice(idx, 1);
            e.currentTarget.classList.remove('active');
        } else {
            state.savedNews.push(n.title);
            e.currentTarget.classList.add('active');
        }
        LS.set('savedNews', state.savedNews);
    });

    card.querySelector('[data-share]')?.addEventListener('click', e => {
        e.stopPropagation();
        const text = `${n.title}\n${n.url}`;
        if (navigator.share) {
            navigator.share({ title: n.title, url: n.url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => toast('Ссылка скопирована'));
        }
    });

    return card;
}

function buildAd() {
    const ad = state.ads[0];
    const wrap = document.createElement('div');
    wrap.className = 'news-ad';
    if (ad.type === 'image' || ad.type === 'gif') {
        wrap.innerHTML = `
            <img src="${ad.url}" alt="Реклама">
            ${ad.text ? `<div class="news-ad-text">${ad.text}</div>` : ''}
            ${ad.link ? `<div style="margin-top:8px;"><a href="${ad.link}" target="_blank" style="color:var(--accent);font-weight:600;">Подробнее →</a></div>` : ''}
        `;
    } else if (ad.type === 'link') {
        wrap.innerHTML = `<a href="${ad.link}" target="_blank" style="color:var(--accent);font-weight:600;">${ad.text || 'Перейти'}</a>`;
    } else if (ad.type === 'html') {
        wrap.innerHTML = ad.text;
    }
    return wrap;
}

document.getElementById('loadMoreNews')?.addEventListener('click', () => renderNews(false));

// ============================================
// КАЛЕНДАРЬ
// ============================================

async function loadCalendar() {
    const list = document.getElementById('calendarList');
    list.innerHTML = '<div class="skeleton-line"></div><div class="skeleton-line"></div>';
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/events?page=1');
        const d = await r.json();
        state.calendar = d.data || [];
        renderCalendar();
    } catch (e) {
        list.innerHTML = '<div class="event-meta">Ошибка загрузки</div>';
    }
}

document.querySelectorAll('#calFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#calFilters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.calendarPeriod = btn.dataset.period;
        renderCalendar();
    });
});

function renderCalendar() {
    const list = document.getElementById('calendarList');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(today); monthEnd.setDate(monthEnd.getDate() + 30);

    let events = state.calendar.map(e => ({ ...e, _date: new Date(e.event_date) }));

    if (state.calendarPeriod === 'today') {
        events = events.filter(e => e._date >= today && e._date < tomorrow);
    } else if (state.calendarPeriod === 'week') {
        events = events.filter(e => e._date >= today && e._date < weekEnd);
    } else {
        events = events.filter(e => e._date >= today && e._date < monthEnd);
    }

    if (!events.length) {
        list.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><i class="fas fa-calendar-times"></i><p>Событий нет</p></div>';
        return;
    }

    list.innerHTML = '';
    events.forEach(e => {
        const dt = e._date;
        const day = String(dt.getDate()).padStart(2, '0');
        const month = dt.toLocaleString('ru', { month: 'short' });
        const item = document.createElement('div');
        item.className = 'calendar-item';
        item.innerHTML = `
            <div class="event-date">
                <div class="event-day">${day}</div>
                <div class="event-month">${month}</div>
            </div>
            <div class="event-body">
                <div class="event-title">${e.name || 'Событие'}</div>
                <div class="event-meta">${e.type || ''} ${e.description ? '• ' + truncate(e.description, 80) : ''}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

// ============================================
// УТИЛИТЫ
// ============================================

function formatPrice(v) {
    if (v === null || v === undefined) return '—';
    if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (v >= 1) return v.toFixed(2);
    if (v >= 0.01) return v.toFixed(4);
    return v.toFixed(8);
}

function formatBigNum(v) {
    if (!v) return '—';
    if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    return '$' + v.toLocaleString();
}

function truncate(t, n) { return t && t.length > n ? t.slice(0, n) + '…' : t; }

function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
        el = document.createElement('div');
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

// Стиль тоста добавляем динамически
const toastStyle = document.createElement('style');
toastStyle.textContent = `
.toast {
    position: fixed;
    bottom: calc(var(--nav-height) + 16px);
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--card);
    color: var(--text);
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 13px;
    border: 1px solid var(--accent);
    opacity: 0;
    pointer-events: none;
    transition: 0.3s;
    z-index: 500;
    max-width: 90%;
    text-align: center;
}
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;
document.head.appendChild(toastStyle);

// ============================================
// АВТООБНОВЛЕНИЕ
// ============================================

// Цены — каждые 60 секунд
setInterval(() => {
    const now = new Date();
    document.getElementById('updateTime').textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (state.page === 'home') { loadTopCoins(); loadTrend(); }
    if (state.page === 'market') renderMarket();
}, 60000);

// Новости — каждые 5 минут
setInterval(() => {
    if (state.page === 'news') loadNews();
    if (state.page === 'home') loadWhyImportant();
}, 5 * 60 * 1000);

// Календарь — каждые 30 минут
setInterval(() => {
    if (state.page === 'calendar') loadCalendar();
}, 30 * 60 * 1000);

// ============================================
// СТАРТ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    document.getElementById('updateTime').textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    loadTrend();
    loadTopCoins();
    loadEventsToday();
    loadWhyImportant();
});

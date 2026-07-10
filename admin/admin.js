// ===== ПРЕФИКС ДЛЯ ИЗОЛЯЦИИ =====
const STORAGE_PREFIX = 'coindigest_';
const LS = {
    get: (key) => JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)),
    set: (key, val) => localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)),
};

// ===== ПАРОЛЬ =====
const ADMIN_PASSWORD = 'crypto2026';

// ===== СОСТОЯНИЕ =====
let isAuthenticated = false;

// ===== ПРОВЕРКА АВТОРИЗАЦИИ =====
function checkAuth() {
    if (sessionStorage.getItem('coindigest_admin_auth') === 'true') {
        isAuthenticated = true;
        renderAdmin();
        return;
    }
    renderLogin();
}

// ===== ФОРМА ВХОДА =====
function renderLogin() {
    const app = document.getElementById('adminApp');
    app.innerHTML = `
        <div class="login-box">
            <h1><i class="fas fa-lock"></i> Вход в админ-панель</h1>
            <p style="color:#848e9c;margin-bottom:20px;">Введите пароль для доступа</p>
            <input type="password" id="passwordInput" placeholder="Пароль" autofocus />
            <br />
            <button onclick="login()"><i class="fas fa-sign-in-alt"></i> Войти</button>
            <div id="loginError" class="error-msg"></div>
        </div>
    `;
    
    const input = document.getElementById('passwordInput');
    if (input) {
        input.focus();
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
}

// ===== ЛОГИН =====
function login() {
    const input = document.getElementById('passwordInput');
    const error = document.getElementById('loginError');
    
    if (!input) return;
    
    if (input.value === ADMIN_PASSWORD) {
        sessionStorage.setItem('coindigest_admin_auth', 'true');
        isAuthenticated = true;
        renderAdmin();
    } else {
        error.textContent = '❌ Неверный пароль! Попробуйте снова.';
        input.value = '';
        input.focus();
    }
}

// ===== ВЫХОД =====
function logout() {
    if (confirm('Выйти из админ-панели?')) {
        sessionStorage.removeItem('coindigest_admin_auth');
        isAuthenticated = false;
        renderLogin();
    }
}

// ===== ОСНОВНОЙ ИНТЕРФЕЙС =====
function renderAdmin() {
    const app = document.getElementById('adminApp');
    app.innerHTML = `
        <h1>
            <span><i class="fas fa-chart-pie"></i> Админ-панель</span>
            <button class="logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Выйти</button>
        </h1>

        <!-- СТАТИСТИКА ПОСЕЩЕНИЙ -->
        <div class="stat-grid">
            <div class="stat-card">
                <div class="number" id="visits">0</div>
                <div class="label">👁️ Посещений</div>
                <div class="sub">За всё время</div>
            </div>
            <div class="stat-card">
                <div class="number" id="todayVisits">0</div>
                <div class="label">📊 Сегодня</div>
                <div class="sub">За текущий день</div>
            </div>
            <div class="stat-card">
                <div class="number" id="weekVisits">0</div>
                <div class="label">📈 За неделю</div>
                <div class="sub">Последние 7 дней</div>
            </div>
            <div class="stat-card">
                <div class="number" id="postsCount">0</div>
                <div class="label">📝 Всего постов</div>
                <div class="sub">Эксклюзивные материалы</div>
            </div>
            <div class="stat-card">
                <div class="number" id="exclusiveCount">0</div>
                <div class="label">⭐ Эксклюзивов</div>
                <div class="sub">Автоматический сбор</div>
            </div>
            <div class="stat-card">
                <div class="number" id="lastUpdate">-</div>
                <div class="label">⏱️ Последний пост</div>
                <div class="sub">Дата публикации</div>
            </div>
        </div>

        <!-- СТАТИСТИКА РЕКЛАМЫ -->
        <div class="section-title"><i class="fas fa-chart-bar"></i> Статистика рекламы</div>
        <div class="stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
            <div class="stat-card">
                <div class="number" id="adTotalShows">0</div>
                <div class="label">👁️ Всего показов</div>
                <div class="sub">За всё время</div>
            </div>
            <div class="stat-card">
                <div class="number" id="adTotalClicks">0</div>
                <div class="label">🖱️ Всего кликов</div>
                <div class="sub">За всё время</div>
            </div>
            <div class="stat-card">
                <div class="number" id="adTodayShows">0</div>
                <div class="label">📊 Показов сегодня</div>
                <div class="sub">За текущий день</div>
            </div>
            <div class="stat-card">
                <div class="number" id="adTodayClicks">0</div>
                <div class="label">📊 Кликов сегодня</div>
                <div class="sub">За текущий день</div>
            </div>
        </div>

        <!-- ТАБЛИЦА СТАТИСТИКИ ПО КАЖДОЙ РЕКЛАМЕ -->
        <div class="section-title" style="margin-top:8px;font-size:15px;">📋 Детальная статистика по объявлениям</div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Название</th>
                        <th style="text-align:center;">Тип</th>
                        <th style="text-align:center;">👁️ Показов</th>
                        <th style="text-align:center;">🖱️ Кликов</th>
                        <th style="text-align:center;">CTR</th>
                        <th style="text-align:center;">📅 Сегодня</th>
                    </tr>
                </thead>
                <tbody id="adStatsBody">
                    <tr><td colspan="6" style="text-align:center;padding:20px;color:#848e9c;">Загрузка...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- УПРАВЛЕНИЕ РЕКЛАМОЙ -->
        <div class="section-title" style="margin-top:30px;"><i class="fas fa-ad"></i> Управление рекламой</div>
        <p style="color:#848e9c;font-size:13px;margin-bottom:12px;">
            Добавляйте баннеры, GIF, видео или ссылки. Реклама будет показываться на сайте с ротацией каждые 30 секунд.
        </p>
        
        <form class="admin-form" id="adForm">
            <div class="form-row">
                <div>
                    <label style="color:#848e9c;font-size:13px;">Тип рекламы</label>
                    <select id="adType">
                        <option value="image">Изображение</option>
                        <option value="gif">GIF</option>
                        <option value="video">Видео</option>
                        <option value="link">Ссылка</option>
                        <option value="html">HTML код</option>
                    </select>
                </div>
                <div>
                    <label style="color:#848e9c;font-size:13px;">Название (для админки)</label>
                    <input type="text" id="adName" placeholder="Моя реклама" />
                </div>
            </div>
            <div id="adFields">
                <label style="color:#848e9c;font-size:13px;">URL файла (изображение, GIF, видео)</label>
                <input type="text" id="adUrl" placeholder="https://example.com/image.jpg" />
                <label style="color:#848e9c;font-size:13px;">Ссылка для перехода (опционально)</label>
                <input type="text" id="adLink" placeholder="https://example.com" />
                <label style="color:#848e9c;font-size:13px;">Текст (для ссылки или HTML)</label>
                <textarea id="adText" placeholder="Текст рекламы или HTML код"></textarea>
            </div>
            <button type="submit"><i class="fas fa-plus"></i> Добавить рекламу</button>
        </form>

        <div class="ad-list" id="adList">
            <div style="color:#848e9c;text-align:center;padding:10px 0;">Загрузка рекламы...</div>
        </div>

        <a href="../index.html" class="back-link"><i class="fas fa-arrow-left"></i> На главную</a>
    `;

    initAdminFunctions();
    updateStats();
    loadAds();
    updateAdStats();
}

// ===== ИНИЦИАЛИЗАЦИЯ ФОРМ =====
function initAdminFunctions() {
    const form = document.getElementById('adForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            addAd();
        });
    }

    const typeSelect = document.getElementById('adType');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            updateAdFields(this.value);
        });
    }
}

function updateAdFields(type) {
    const urlField = document.getElementById('adUrl');
    const linkField = document.getElementById('adLink');
    const textField = document.getElementById('adText');
    
    if (!urlField || !linkField || !textField) return;
    
    const urlLabel = urlField.previousElementSibling;
    const linkLabel = linkField.previousElementSibling;
    const textLabel = textField.previousElementSibling;
    
    if (type === 'link') {
        urlField.style.display = 'none';
        urlLabel.style.display = 'none';
        linkField.style.display = 'block';
        linkLabel.style.display = 'block';
        textField.style.display = 'block';
        textLabel.style.display = 'block';
        linkField.placeholder = 'https://example.com (обязательно)';
        textField.placeholder = 'Текст ссылки';
    } else if (type === 'html') {
        urlField.style.display = 'none';
        urlLabel.style.display = 'none';
        linkField.style.display = 'none';
        linkLabel.style.display = 'none';
        textField.style.display = 'block';
        textLabel.style.display = 'block';
        textField.placeholder = 'HTML код рекламы';
        textField.style.minHeight = '100px';
    } else {
        urlField.style.display = 'block';
        urlLabel.style.display = 'block';
        linkField.style.display = 'block';
        linkLabel.style.display = 'block';
        textField.style.display = 'block';
        textLabel.style.display = 'block';
        urlField.placeholder = 'https://example.com/image.jpg';
        linkField.placeholder = 'https://example.com (опционально)';
        textField.placeholder = 'Текст (опционально)';
        textField.style.minHeight = '80px';
    }
}

// ===== ДОБАВЛЕНИЕ РЕКЛАМЫ =====
function addAd() {
    const type = document.getElementById('adType').value;
    const name = document.getElementById('adName').value.trim() || 'Без названия';
    const url = document.getElementById('adUrl').value.trim();
    const link = document.getElementById('adLink').value.trim();
    const text = document.getElementById('adText').value.trim();

    if (type === 'link' && !link) {
        showToast('⚠️ Для ссылки укажите URL перехода', 'error');
        return;
    }

    if ((type === 'image' || type === 'gif' || type === 'video') && !url) {
        showToast('⚠️ Укажите URL файла', 'error');
        return;
    }

    if (type === 'html' && !text) {
        showToast('⚠️ Введите HTML код', 'error');
        return;
    }

    const ads = LS.get('ads') || [];
    const newAd = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        type: type,
        name: name,
        url: url,
        link: link,
        text: text,
        created: new Date().toISOString()
    };

    ads.push(newAd);
    LS.set('ads', ads);
    
    document.getElementById('adForm').reset();
    loadAds();
    updateAdStats();
    showToast('✅ Реклама добавлена!');
}

// ===== ЗАГРУЗКА РЕКЛАМЫ =====
function loadAds() {
    const container = document.getElementById('adList');
    const ads = LS.get('ads') || [];

    if (ads.length === 0) {
        container.innerHTML = '<div class="empty-msg">📭 Реклама не добавлена</div>';
        return;
    }

    container.innerHTML = '';
    ads.forEach((ad, index) => {
        const div = document.createElement('div');
        div.className = 'ad-item';
        div.innerHTML = `
            <div class="ad-info">
                <strong>${ad.name}</strong>
                <small>Тип: ${ad.type} | ${ad.created ? new Date(ad.created).toLocaleDateString() : ''}</small>
                ${ad.url ? `<div style="font-size:11px;color:#848e9c;word-break:break-all;">${ad.url}</div>` : ''}
                ${ad.link ? `<div style="font-size:11px;color:#848e9c;word-break:break-all;">🔗 ${ad.link}</div>` : ''}
            </div>
            <div class="ad-actions">
                <button class="edit-btn" onclick="editAd(${index})"><i class="fas fa-edit"></i> Просмотр</button>
                <button onclick="deleteAd(${index})"><i class="fas fa-trash"></i> Удалить</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ===== УДАЛЕНИЕ РЕКЛАМЫ =====
function deleteAd(index) {
    if (!confirm('Удалить эту рекламу?')) return;
    
    let ads = LS.get('ads') || [];
    ads.splice(index, 1);
    LS.set('ads', ads);
    loadAds();
    updateAdStats();
    showToast('🗑️ Реклама удалена');
}

// ===== ПРОСМОТР РЕКЛАМЫ =====
function editAd(index) {
    const ads = LS.get('ads') || [];
    const ad = ads[index];
    if (!ad) return;

    let preview = '';
    if (ad.type === 'image' || ad.type === 'gif') {
        preview = `<img src="${ad.url}" alt="${ad.name}" style="max-width:100%;max-height:200px;border-radius:4px;" />`;
    } else if (ad.type === 'video') {
        preview = `<video controls autoplay muted loop style="max-width:100%;max-height:200px;border-radius:4px;"><source src="${ad.url}" type="video/mp4"></video>`;
    } else if (ad.type === 'link') {
        preview = `<a href="${ad.link}" target="_blank" style="color:#f0b90b;font-size:16px;">${ad.text || ad.link}</a>`;
    } else if (ad.type === 'html') {
        preview = ad.text;
    }

    showToast(`📺 ${ad.name}`, 'preview', preview);
}

// ===== СТАТИСТИКА ПОСЕЩЕНИЙ =====
function updateStats() {
    // Инициализация
    if (!LS.get('visits')) LS.set('visits', 0);
    
    const todayKey = new Date().toISOString().split('T')[0];
    let todayStats = LS.get('todayStats') || {};
    if (todayStats.date !== todayKey) {
        todayStats = { date: todayKey, count: 0 };
        LS.set('todayStats', todayStats);
    }
    
    const weekKey = getWeekKey();
    let weekStats = LS.get('weekStats') || {};
    if (weekStats.week !== weekKey) {
        weekStats = { week: weekKey, count: 0 };
        LS.set('weekStats', weekStats);
    }

    // Отображение
    document.getElementById('visits').textContent = LS.get('visits') || 0;
    document.getElementById('todayVisits').textContent = todayStats.count || 0;
    document.getElementById('weekVisits').textContent = weekStats.count || 0;

    const posts = LS.get('posts') || [];
    document.getElementById('postsCount').textContent = posts.length;
    document.getElementById('exclusiveCount').textContent = posts.filter(p => p.isExclusive === true).length;

    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        if (posts.length > 0) {
            const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
            lastUpdateEl.textContent = sorted[0].date || '-';
        } else {
            lastUpdateEl.textContent = '-';
        }
    }
}

function getWeekKey() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return start.toISOString().split('T')[0];
}

// ===== СТАТИСТИКА РЕКЛАМЫ =====
function updateAdStats() {
    const stats = LS.get('adStats') || {
        totalShows: 0,
        totalClicks: 0,
        todayShows: 0,
        todayClicks: 0,
        todayDate: new Date().toISOString().split('T')[0]
    };
    
    document.getElementById('adTotalShows').textContent = stats.totalShows || 0;
    document.getElementById('adTotalClicks').textContent = stats.totalClicks || 0;
    document.getElementById('adTodayShows').textContent = stats.todayShows || 0;
    document.getElementById('adTodayClicks').textContent = stats.todayClicks || 0;
    
    // Таблица по каждому объявлению
    const ads = LS.get('ads') || [];
    const adStats = LS.get('adItemStats') || {};
    const tbody = document.getElementById('adStatsBody');
    
    if (!tbody) return;
    
    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#848e9c;">Реклама не добавлена</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    ads.forEach(ad => {
        const itemStats = adStats[ad.id] || { shows: 0, clicks: 0, todayShows: 0, todayClicks: 0 };
        const ctr = itemStats.shows > 0 ? ((itemStats.clicks / itemStats.shows) * 100).toFixed(1) : '0.0';
        const ctrClass = parseFloat(ctr) > 5 ? 'ctr-high' : parseFloat(ctr) > 1 ? 'ctr-mid' : 'ctr-low';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${ad.name}</strong></td>
            <td style="text-align:center;color:#848e9c;">${ad.type}</td>
            <td style="text-align:center;color:#f0b90b;">${itemStats.shows || 0}</td>
            <td style="text-align:center;color:#0ecb81;">${itemStats.clicks || 0}</td>
            <td style="text-align:center;font-weight:600;" class="${ctrClass}">${ctr}%</td>
            <td style="text-align:center;color:#848e9c;font-size:12px;">
                👁️ ${itemStats.todayShows || 0} / 🖱️ ${itemStats.todayClicks || 0}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ===== ТОСТ-УВЕДОМЛЕНИЕ =====
function showToast(message, type = 'success', extra = '') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    let bg = '#0ecb81';
    if (type === 'error') bg = '#f6465d';
    if (type === 'preview') bg = '#1e2329';
    
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${bg};
        color: ${type === 'preview' ? '#eaecef' : '#fff'};
        padding: ${type === 'preview' ? '16px 24px' : '12px 24px'};
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        animation: fadeInUp 0.3s ease;
        max-width: 90%;
        text-align: center;
        border: ${type === 'preview' ? '1px solid #f0b90b' : 'none'};
        min-width: ${type === 'preview' ? '300px' : 'auto'};
    `;
    
    let content = message;
    if (type === 'preview' && extra) {
        content = `<strong style="color:#f0b90b;">${message}</strong><div style="margin-top:10px;">${extra}</div>`;
    }
    toast.innerHTML = content;
    document.body.appendChild(toast);

    if (type !== 'preview') {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    } else {
        toast.style.cursor = 'pointer';
        toast.onclick = function() {
            this.style.opacity = '0';
            this.style.transform = 'translateX(-50%) translateY(20px)';
            this.style.transition = 'opacity 0.3s, transform 0.3s';
            setTimeout(() => this.remove(), 300);
        };
    }
}

// ===== ЗАПУСК =====
checkAuth();

const styleToast = document.createElement('style');
styleToast.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(styleToast);

// ===== ПРЕФИКС ДЛЯ ИЗОЛЯЦИИ =====
const STORAGE_PREFIX = 'coindigest_';
const LS = {
    get: (key) => JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)),
    set: (key, val) => localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)),
};

// ===== ПАРОЛЬ (ИЗМЕНИТЕ НА СВОЙ) =====
const ADMIN_PASSWORD = 'MyStrongPass2026!';

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
            <span><i class="fas fa-user-cog"></i> Админ-панель</span>
            <button class="logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Выйти</button>
        </h1>

        <div class="stat-grid">
            <div class="stat-card">
                <div class="number" id="visits">0</div>
                <div class="label">👁️ Посещений</div>
            </div>
            <div class="stat-card">
                <div class="number" id="postsCount">0</div>
                <div class="label">📝 Всего постов</div>
            </div>
            <div class="stat-card">
                <div class="number" id="lastUpdate">-</div>
                <div class="label">⏱️ Последний пост</div>
            </div>
        </div>

        <h2 style="font-size:18px;margin-bottom:12px;color:#eaecef;">
            <i class="fas fa-plus-circle" style="color:#f0b90b;"></i> Добавить пост
        </h2>
        <form class="admin-form" id="postForm">
            <input type="text" id="postTitle" placeholder="Заголовок поста" required />
            <textarea id="postContent" rows="4" placeholder="Текст поста" required></textarea>
            <button type="submit"><i class="fas fa-paper-plane"></i> Опубликовать</button>
        </form>

        <div class="post-list">
            <h2><i class="fas fa-list" style="color:#f0b90b;"></i> Все посты</h2>
            <div id="postsContainerAdmin"></div>
        </div>

        <a href="../index.html" class="back-link"><i class="fas fa-arrow-left"></i> На главную</a>
    `;

    initAdminFunctions();
    updateStats();
    loadPosts();
}

// ===== ИНИЦИАЛИЗАЦИЯ ФОРМ =====
function initAdminFunctions() {
    const form = document.getElementById('postForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('postTitle').value.trim();
            const content = document.getElementById('postContent').value.trim();
            if (title && content) {
                addPost(title, content);
                this.reset();
                document.getElementById('postTitle').focus();
                showToast('✅ Пост опубликован!');
            } else {
                showToast('⚠️ Заполните все поля.', 'error');
            }
        });
    }
}

// ===== СТАТИСТИКА =====
function updateStats() {
    let visits = LS.get('visits') || 0;
    if (!sessionStorage.getItem('coindigest_visited')) {
        visits++;
        LS.set('visits', visits);
        sessionStorage.setItem('coindigest_visited', 'true');
    }
    
    const visitsEl = document.getElementById('visits');
    if (visitsEl) visitsEl.textContent = visits;

    const posts = LS.get('posts') || [];
    const postsCountEl = document.getElementById('postsCount');
    if (postsCountEl) postsCountEl.textContent = posts.length;

    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = posts.length > 0 ? posts[posts.length - 1].date : '-';
    }
}

// ===== ЗАГРУЗКА ПОСТОВ =====
function loadPosts() {
    const posts = LS.get('posts') || [];
    const container = document.getElementById('postsContainerAdmin');
    if (!container) return;
    
    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = '<p style="color:#848e9c;text-align:center;padding:20px 0;">Постов пока нет. Добавьте первый!</p>';
        return;
    }

    posts.slice().reverse().forEach((post, index) => {
        const div = document.createElement('div');
        div.className = 'post-item';
        div.innerHTML = `
            <div class="post-content">
                <strong>${escapeHtml(post.title)}</strong>
                <small>${post.date}</small>
                <p>${escapeHtml(post.content.substring(0, 100))}${post.content.length > 100 ? '...' : ''}</p>
            </div>
            <button class="delete-btn" data-index="${index}"><i class="fas fa-trash"></i> Удалить</button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const realIndex = posts.length - 1 - parseInt(this.dataset.index);
            if (confirm('Удалить этот пост?')) {
                deletePost(realIndex);
            }
        });
    });
}

// ===== ДОБАВЛЕНИЕ ПОСТА =====
function addPost(title, content) {
    const posts = LS.get('posts') || [];
    const newPost = {
        id: Date.now(),
        title: title.trim(),
        content: content.trim(),
        date: new Date().toISOString().split('T')[0]
    };
    posts.push(newPost);
    LS.set('posts', posts);
    syncToJSON(posts);
    loadPosts();
    updateStats();
}

// ===== УДАЛЕНИЕ ПОСТА =====
function deletePost(index) {
    let posts = LS.get('posts') || [];
    if (index >= 0 && index < posts.length) {
        posts.splice(index, 1);
        LS.set('posts', posts);
        syncToJSON(posts);
        loadPosts();
        updateStats();
        showToast('🗑️ Пост удалён');
    }
}

// ===== СИНХРОНИЗАЦИЯ С JSON =====
async function syncToJSON(posts) {
    try {
        console.log('✅ Посты синхронизированы с localStorage');
    } catch (e) {
        console.error('Ошибка синхронизации:', e);
    }
}

// ===== ТОСТ-УВЕДОМЛЕНИЕ =====
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#f6465d' : '#0ecb81'};
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        animation: fadeInUp 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ===== ESCAPE HTML =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== ЗАПУСК =====
if (!LS.get('visits')) {
    LS.set('visits', 0);
}

checkAuth();

// Добавляем стили для toast
const styleToast = document.createElement('style');
styleToast.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(styleToast);

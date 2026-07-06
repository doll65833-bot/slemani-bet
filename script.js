// ========== بەکارهێنەران لۆکاڵ ==========
function getCurrentUser() {
    const user = localStorage.getItem('slemani_user');
    return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('slemani_user', JSON.stringify(user));
    updateUIForUser();
}

function logout() {
    localStorage.removeItem('slemani_user');
    updateUIForUser();
    showToast('لە ئەکاونتەکەت دەرچوویت', 'success');
}

function updateUIForUser() {
    const user = getCurrentUser();
    const actions = document.querySelector('.user-actions');
    
    if (user) {
        actions.innerHTML = `
            <div class="user-info">
                <span class="user-balance">💰 ${(user.balance || 0).toLocaleString()} دینار</span>
                <button class="btn btn-secondary" onclick="goToProfile()">
                    <i class="fas fa-user"></i> ${user.first_name}
                </button>
                <button class="btn btn-login" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> دەرچوون
                </button>
            </div>
        `;
    } else {
        actions.innerHTML = `
            <button class="btn btn-login" onclick="openModal('loginModal')">
                <i class="fas fa-sign-in-alt"></i> چوونەژوورەوە
            </button>
            <button class="btn btn-register" onclick="openModal('registerModal')">
                <i class="fas fa-user-plus"></i> تۆمارکردن
            </button>
        `;
    }
}

// ========== مۆدال ==========
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => openModal(to), 200);
}

// کلیک لە دەرەوەی مۆدال
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// ========== تۆمارکردن ==========
function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        showToast('وشەی نهێنیەکان یەک ناگرنەوە!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('وشەی نهێنی دەبێت لانیکەم 6 پیت بێت!', 'error');
        return;
    }
    
    // پاشەکەوتکردنی بەکارهێنەر
    const user = {
        username: username,
        email: email,
        phone: phone,
        first_name: username,
        balance: 0,
        total_deposit: 0,
        total_withdrawal: 0,
        joined_date: new Date().toISOString()
    };
    
    setCurrentUser(user);
    closeModal('registerModal');
    showToast('تۆمارکردن سەرکەوتوو بوو! بۆنوسی %150 چاوەڕوانە بکە!', 'success');
    
    // بۆتەکە بۆ پارە داخڵ کردن
    setTimeout(() => {
        showToast('بۆ پارە داخڵ کردن، بۆتی تێلەگراممان بەکاربهێنە', 'success');
    }, 2000);
}

// ========== چوونەژوورەوە ==========
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    // سادە - لە ڕاستایدا دەبێت لە بۆتەکە بێت
    const user = {
        username: username,
        first_name: username,
        balance: 0,
        total_deposit: 0,
        total_withdrawal: 0,
        joined_date: new Date().toISOString()
    };
    
    setCurrentUser(user);
    closeModal('loginModal');
    showToast('بەخێربێیتەوە!', 'success');
}

// ========== یارمەتیدەرەکان ==========
function scrollToDeposit() {
    document.getElementById('deposit').scrollIntoView({ behavior: 'smooth' });
}

function scrollToGames() {
    document.getElementById('games').scrollIntoView({ behavior: 'smooth' });
}

function showAlert(gameName) {
    showToast(`یاری ${gameName} بەم زووانە دەکرێتەوە. پارە داخڵ بکە لە بۆتەکە!`, 'success');
}

function selectMethod(method) {
    const methods = {
        asia: 'کارتی ئاسیا',
        zain: 'زەین کاش',
        korek: 'کۆڕەک',
        zaincharg: 'زیچارج'
    };
    
    const methodName = methods[method] || 'خەیاڵی';
    
    if (method === 'zaincharg') {
        showToast('پارە بنێرە بۆ ژمارە 7870218371 و بۆتەکەمان بەکاربهێنە', 'success');
    }
    
    setTimeout(() => {
        goToBot(method);
    }, 1500);
}

function goToBot(method = '') {
    const botUsername = 'YOUR_BOT_USERNAME'; // لێرە یوزەرنەیمی بۆتەکەت بنووسە
    const url = `https://t.me/${botUsername}${method ? '?start=' + method : ''}`;
    window.open(url, '_blank');
    showToast('بۆتی تێلەگرام دەکرێتەوە...', 'success');
}

function goToProfile() {
    showToast('پرۆفایل بەم زووانە دەکرێتەوە', 'success');
}

// ========== توست (ئاگادارکردنەوە) ==========
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} active`;
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}

// ========== سەرەتا ==========
document.addEventListener('DOMContentLoaded', function() {
    updateUIForUser();
    
    // لۆدی ئەنیمەیشن
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    document.querySelectorAll('.game-card, .feature-item, .method-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
    
    // کۆنتڕۆڵی ئەدمین پانێڵ لە URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        window.location.href = 'admin.html';
    }
});

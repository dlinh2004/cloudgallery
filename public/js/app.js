// ==========================================
// FRONTEND JAVASCRIPT (Client-Side Logic)
// ==========================================
// File này xử lý tất cả logic phía client:
// gọi API, hiển thị dữ liệu, xử lý form.

// ---- BIẾN TOÀN CỤC ----
let currentUser = null;
let activeCommentSectionImageId = null;
let notificationPollTimer = null;

// ==========================================
// KHỞI TẠO KHI TRANG ĐƯỢC LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    initImagePreview();

    // Enter to submit comments
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
            e.preventDefault();
            const sibling = e.target.nextElementSibling;
            if (sibling) sibling.click();
        }
    });

    document.addEventListener('click', (e) => {
        const wrapper = e.target.closest('.notification-wrapper');
        if (!wrapper) {
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) dropdown.style.display = 'none';
        }
    });

    // Kiểm tra trang hiện tại và load dữ liệu phù hợp
    const page = window.location.pathname;

    if (page === '/gallery.html') {
        loadGallery();
    } else if (page === '/dashboard.html') {
        loadDashboard();
    }
});

// ==========================================
// KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
// ==========================================
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        currentUser = data.user;
        updateNavbar();

        if (currentUser) {
            startNotificationPolling();
        } else {
            stopNotificationPolling();
        }
    } catch (error) {
        console.error('Check auth error:', error);
    }
}

// Cập nhật navbar dựa trên trạng thái đăng nhập
function updateNavbar() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    if (currentUser) {
        // Đã đăng nhập: hiển thị Dashboard, Gallery, Logout
        navLinks.innerHTML = `
            <a href="/gallery.html">Gallery</a>
            <a href="/dashboard.html">Dashboard</a>
            <div class="notification-wrapper">
                <button class="btn-notification" onclick="toggleNotificationDropdown(event)" aria-label="Thong bao">
                    🔔
                    <span id="notification-badge" class="notification-badge" style="display:none;">0</span>
                </button>
                <div id="notification-dropdown" class="notification-dropdown">
                    <div class="notification-header">
                        <strong>Thong bao</strong>
                        <button class="btn-mark-all-read" onclick="markAllNotificationsRead()">Danh dau da doc</button>
                    </div>
                    <div id="notification-list" class="notification-list">
                        <p class="notification-empty">Chua co thong bao</p>
                    </div>
                </div>
            </div>
            <span style="color: white; font-weight: 500;">Xin chào, ${escapeHtml(currentUser.username)}</span>
            <a href="#" class="btn-logout" onclick="logout()">Đăng xuất</a>
        `;
    } else {
        // Chưa đăng nhập: hiển thị Gallery, Login, Register
        navLinks.innerHTML = `
            <a href="/gallery.html">Gallery</a>
            <a href="/login.html">Đăng nhập</a>
            <a href="/register.html">Đăng ký</a>
        `;
    }
}

function setupNavigation() {
    // Chuyển hướng nếu chưa đăng nhập mà vào trang cần auth
    const protectedPages = ['/dashboard.html'];
    const page = window.location.pathname;

    // Sẽ được kiểm tra lại sau khi checkAuth hoàn tất
    setTimeout(() => {
        if (protectedPages.includes(page) && !currentUser) {
            window.location.href = '/login.html';
        }
    }, 500);
}

// ==========================================
// ĐĂNG KÝ (Register)
// ==========================================
async function handleRegister(event) {
    event.preventDefault();
    hideAlerts();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !email || !password) {
        showAlert('error', 'Vui lòng điền đầy đủ thông tin');
        return;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            showAlert('success', 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500);
        } else {
            showAlert('error', data.error);
        }
    } catch (error) {
        showAlert('error', 'Lỗi kết nối, vui lòng thử lại');
    }
}

// ==========================================
// ĐĂNG NHẬP (Login)
// ==========================================
async function handleLogin(event) {
    event.preventDefault();
    hideAlerts();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showAlert('error', 'Vui lòng nhập username và password');
        return;
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            showAlert('success', 'Đăng nhập thành công!');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showAlert('error', data.error);
        }
    } catch (error) {
        showAlert('error', 'Lỗi kết nối, vui lòng thử lại');
    }
}

// ==========================================
// ĐĂNG XUẤT (Logout)
// ==========================================
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        stopNotificationPolling();
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function startNotificationPolling() {
    stopNotificationPolling();
    loadNotifications();
    notificationPollTimer = setInterval(loadNotifications, 15000);
}

function stopNotificationPolling() {
    if (notificationPollTimer) {
        clearInterval(notificationPollTimer);
        notificationPollTimer = null;
    }
}

function toggleNotificationDropdown(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
        loadNotifications();
    }
}

async function loadNotifications() {
    if (!currentUser) return;

    try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;

        const data = await res.json();
        renderNotifications(data.notifications || []);
        renderNotificationBadge(data.unreadCount || 0);
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

function renderNotificationBadge(unreadCount) {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    if (unreadCount > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    } else {
        badge.style.display = 'none';
    }
}

function renderNotifications(notifications) {
    const list = document.getElementById('notification-list');
    if (!list) return;

    if (!notifications.length) {
        list.innerHTML = '<p class="notification-empty">Chua co thong bao</p>';
        return;
    }

    list.innerHTML = notifications.map((item) => `
        <button class="notification-item ${item.is_read ? '' : 'unread'}"
            onclick="openNotification(${item.id}, ${item.image_id}, '${escapeHtml(item.type)}')">
            <p class="notification-message">${escapeHtml(item.message)}</p>
            <span class="notification-time">${formatDate(item.created_at)}</span>
        </button>
    `).join('');
}

async function markNotificationRead(notificationId) {
    try {
        await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
    } catch (error) {
        console.error('Mark notification read error:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        const res = await fetch('/api/notifications/read-all', { method: 'POST' });
        if (!res.ok) return;
        loadNotifications();
    } catch (error) {
        console.error('Mark all notifications read error:', error);
    }
}

async function openNotification(notificationId, imageId, type) {
    await markNotificationRead(notificationId);

    const shouldOpenComments = type === 'comment' || type === 'reply';
    const params = new URLSearchParams({ imageId: String(imageId) });
    if (shouldOpenComments) params.set('openComments', '1');

    window.location.href = `/gallery.html?${params.toString()}`;
}

// ==========================================
// UPLOAD ẢNH
// ==========================================
async function handleUpload(event) {
    event.preventDefault();
    hideAlerts();

    const form = document.getElementById('upload-form');
    const formData = new FormData(form);

    // Kiểm tra file
    const fileInput = document.getElementById('image-file');
    if (!fileInput.files || fileInput.files.length === 0) {
        showAlert('error', 'Vui lòng chọn ảnh để upload');
        return;
    }

    try {
        const res = await fetch('/api/images/upload', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            showAlert('success', 'Upload ảnh thành công!');
            form.reset();
            // Reload danh sách ảnh
            loadDashboard();
        } else {
            showAlert('error', data.error);
        }
    } catch (error) {
        showAlert('error', 'Lỗi khi upload ảnh');
    }
}

// ==========================================
// LOAD GALLERY (Tất cả ảnh)
// ==========================================
async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Đang tải ảnh...</div>';

    try {
        const res = await fetch('/api/images');
        const images = await res.json();

        if (images.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="icon">📷</div>
                    <h3>Chưa có ảnh nào</h3>
                    <p>Hãy đăng nhập và upload ảnh đầu tiên!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = images.map(img => `
            <div class="image-card" data-image-id="${img.id}">
                <img class="previewable-image" src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.title)}" loading="lazy">
                <div class="card-body">
                    <h3>${escapeHtml(img.title)}</h3>
                    <p>${escapeHtml(img.description || '')}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-like" data-image-id="${img.id}" onclick="toggleLike(${img.id})">
                        <span class="heart-icon">♡</span>
                        <span class="like-count" id="like-count-${img.id}">0</span>
                    </button>
                    <button class="btn-comment-toggle" onclick="toggleCommentSection(${img.id})">
                        💬 <span id="comment-count-${img.id}">0</span> Bình luận
                    </button>
                </div>
                <div class="comment-section" id="comment-section-${img.id}" style="display:none;">
                    <div class="comment-list" id="comment-list-${img.id}"></div>
                    <div class="comment-form">
                        <input type="text" class="comment-input" id="comment-input-${img.id}" placeholder="Viết bình luận..." maxlength="500">
                        <button class="btn-send-comment" onclick="addComment(${img.id})">Gửi</button>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="author">📸 ${escapeHtml(img.username)}</span>
                    <span class="date">${formatDate(img.created_at)}</span>
                </div>
            </div>
        `).join('');

        // Load likes & comment counts
        images.forEach(img => {
            loadLikes(img.id);
            loadCommentCount(img.id);
        });

        focusImageFromQuery();
    } catch (error) {
        grid.innerHTML = '<div class="empty-state"><h3>Lỗi khi tải ảnh</h3></div>';
    }
}

function focusImageFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const imageId = Number.parseInt(params.get('imageId') || '', 10);
    if (Number.isNaN(imageId)) return;

    const card = document.querySelector(`.image-card[data-image-id="${imageId}"]`);
    if (!card) return;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const shouldOpenComments = params.get('openComments') === '1';
    if (shouldOpenComments) {
        const section = document.getElementById(`comment-section-${imageId}`);
        if (section && section.style.display === 'none') {
            toggleCommentSection(imageId);
        }
    }
}

// ==========================================
// LOAD DASHBOARD (Ảnh của user)
// ==========================================
async function loadDashboard() {
    const grid = document.getElementById('my-images-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Đang tải ảnh của bạn...</div>';

    try {
        const res = await fetch('/api/images/my');

        if (res.status === 401 || res.redirected) {
            window.location.href = '/login.html';
            return;
        }

        const images = await res.json();

        if (images.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="icon">🖼️</div>
                    <h3>Bạn chưa upload ảnh nào</h3>
                    <p>Hãy upload ảnh đầu tiên ở form phía trên!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = images.map(img => `
            <div class="image-card">
                <img class="previewable-image" src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.title)}" loading="lazy">
                <div class="card-body">
                    <h3>${escapeHtml(img.title)}</h3>
                    <p>${escapeHtml(img.description || '')}</p>
                </div>
                <div class="card-footer">
                    <span class="date">${formatDate(img.created_at)}</span>
                    <button class="btn btn-danger" onclick="deleteImage(${img.id})">Xóa</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        grid.innerHTML = '<div class="empty-state"><h3>Lỗi khi tải ảnh</h3></div>';
    }
}

// ==========================================
// XÓA ẢNH
// ==========================================
async function deleteImage(imageId) {
    if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;

    try {
        const res = await fetch(`/api/images/${imageId}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
            showAlert('success', 'Đã xóa ảnh thành công!');
            loadDashboard();
        } else {
            showAlert('error', data.error);
        }
    } catch (error) {
        showAlert('error', 'Lỗi khi xóa ảnh');
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Hiển thị thông báo
function showAlert(type, message) {
    // Ẩn tất cả alert trước
    hideAlerts();

    const alertEl = document.getElementById(`alert-${type}`);
    if (alertEl) {
        alertEl.textContent = message;
        alertEl.style.display = 'block';

        // Tự ẩn sau 5 giây
        setTimeout(() => {
            alertEl.style.display = 'none';
        }, 5000);
    }
}

function hideAlerts() {
    document.querySelectorAll('.alert').forEach(el => {
        el.style.display = 'none';
    });
}

// Full-screen image preview (lightbox)
function initImagePreview() {
    const overlay = document.createElement('div');
    overlay.id = 'image-preview-overlay';
    overlay.className = 'image-preview-overlay';
    overlay.innerHTML = `
        <button class="image-preview-close" id="image-preview-close" aria-label="Đóng">&times;</button>
        <img id="image-preview-img" src="" alt="Xem ảnh đầy đủ">
    `;
    document.body.appendChild(overlay);

    document.addEventListener('click', (event) => {
        const clickedImage = event.target.closest('.previewable-image');
        if (clickedImage) {
            openImagePreview(clickedImage.getAttribute('src'), clickedImage.getAttribute('alt'));
            return;
        }

        if (event.target.id === 'image-preview-overlay' || event.target.id === 'image-preview-close') {
            closeImagePreview();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeImagePreview();
        }
    });
}

function openImagePreview(src, alt) {
    const overlay = document.getElementById('image-preview-overlay');
    const previewImg = document.getElementById('image-preview-img');
    if (!overlay || !previewImg || !src) return;

    previewImg.src = src;
    previewImg.alt = alt || 'Xem ảnh đầy đủ';
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeImagePreview() {
    const overlay = document.getElementById('image-preview-overlay');
    const previewImg = document.getElementById('image-preview-img');
    if (!overlay || !previewImg) return;

    overlay.classList.remove('show');
    previewImg.src = '';
    document.body.style.overflow = '';
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format ngày tháng
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ==========================================
// LIKES (Thả tim)
// ==========================================
async function loadLikes(imageId) {
    try {
        const res = await fetch(`/api/interactions/${imageId}/likes`);
        const data = await res.json();
        const countEl = document.getElementById(`like-count-${imageId}`);
        const btn = document.querySelector(`.btn-like[data-image-id="${imageId}"]`);
        if (countEl) countEl.textContent = data.count;
        if (btn) {
            const heart = btn.querySelector('.heart-icon');
            if (data.liked) {
                btn.classList.add('liked');
                heart.textContent = '❤️';
            } else {
                btn.classList.remove('liked');
                heart.textContent = '♡';
            }
        }
    } catch (e) { /* ignore */ }
}

async function toggleLike(imageId) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để thả tim!');
        window.location.href = '/login.html';
        return;
    }
    try {
        const res = await fetch(`/api/interactions/${imageId}/like`, { method: 'POST' });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Không thể thả tim lúc này');
            return;
        }

        const countEl = document.getElementById(`like-count-${imageId}`);
        const btn = document.querySelector(`.btn-like[data-image-id="${imageId}"]`);
        if (countEl) countEl.textContent = data.count;
        if (btn) {
            const heart = btn.querySelector('.heart-icon');
            if (data.liked) {
                btn.classList.add('liked');
                heart.textContent = '❤️';
            } else {
                btn.classList.remove('liked');
                heart.textContent = '♡';
            }
        }
    } catch (e) {
        console.error('Like error:', e);
    }
}

// ==========================================
// COMMENTS (Bình luận)
// ==========================================
function toggleCommentSection(imageId) {
    const section = document.getElementById(`comment-section-${imageId}`);
    if (!section) return;

    // Luôn đóng các section khác để chỉ hiển thị tối đa 1 khung bình luận.
    document.querySelectorAll('.comment-section').forEach((el) => {
        if (el.id !== `comment-section-${imageId}`) {
            el.style.display = 'none';
        }
    });

    const isHidden = section.style.display === 'none';
    section.style.display = isHidden ? 'block' : 'none';

    if (isHidden) {
        activeCommentSectionImageId = imageId;
        loadComments(imageId);
    } else {
        activeCommentSectionImageId = null;
    }
}

async function loadCommentCount(imageId) {
    try {
        const res = await fetch(`/api/interactions/${imageId}/comments`);
        const comments = await res.json();
        if (!Array.isArray(comments)) return;

        const total = countCommentNodes(comments);
        const el = document.getElementById(`comment-count-${imageId}`);
        if (el) el.textContent = total;
    } catch (e) { /* ignore */ }
}

async function loadComments(imageId) {
    const list = document.getElementById(`comment-list-${imageId}`);
    if (!list) return;
    list.innerHTML = '<div class="loading" style="padding:10px;">Đang tải...</div>';

    try {
        const res = await fetch(`/api/interactions/${imageId}/comments`);
        const comments = await res.json();

        if (!res.ok) {
            throw new Error(comments.error || 'Không thể tải bình luận');
        }

        if (!Array.isArray(comments)) {
            throw new Error('Dữ liệu bình luận không hợp lệ');
        }

        if (comments.length === 0) {
            list.innerHTML = '<p class="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
            return;
        }

        list.innerHTML = comments.map(c => renderCommentNode(c, imageId)).join('');
    } catch (e) {
        list.innerHTML = `<p class="no-comments">${escapeHtml(e.message || 'Lỗi khi tải bình luận')}</p>`;
    }
}

function countCommentNodes(comments) {
    return comments.reduce((total, comment) => {
        const replyCount = Array.isArray(comment.replies) ? countCommentNodes(comment.replies) : 0;
        return total + 1 + replyCount;
    }, 0);
}

function renderCommentNode(comment, imageId, level = 0) {
    const isOwner = currentUser && currentUser.id === comment.user_id;
    const replies = (comment.replies || []).map(r => renderCommentNode(r, imageId, level + 1)).join('');
    const replyPlaceholderName = escapeHtml(comment.username || 'bạn');
    const levelClass = level > 0 ? 'reply-item' : '';

    return `
        <div class="comment-item ${levelClass}" id="comment-${comment.id}">
            <div class="comment-header">
                <strong>${escapeHtml(comment.username)}</strong>
                <span class="comment-date">${formatDate(comment.created_at)}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                <button class="btn-reply" onclick="showReplyForm(${comment.id})">Trả lời</button>
                ${isOwner ? `<button class="btn-delete-comment" onclick="deleteComment(${comment.id}, ${imageId})">Xóa</button>` : ''}
            </div>
            <div class="reply-form" id="reply-form-${comment.id}" style="display:none;">
                <input type="text" class="comment-input reply-input" id="reply-input-${comment.id}" placeholder="Trả lời ${replyPlaceholderName}..." maxlength="500">
                <button class="btn-send-comment btn-send-reply" onclick="addReply(${imageId}, ${comment.id})">Gửi</button>
            </div>
            <div class="replies">${replies}</div>
        </div>
    `;
}

function showReplyForm(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (!form) return;
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    if (form.style.display === 'flex') {
        document.getElementById(`reply-input-${commentId}`).focus();
    }
}

async function addComment(imageId) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để bình luận!');
        window.location.href = '/login.html';
        return;
    }
    const input = document.getElementById(`comment-input-${imageId}`);
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`/api/interactions/${imageId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        const data = await res.json();

        if (res.ok) {
            input.value = '';
            loadComments(imageId);
            loadCommentCount(imageId);
            return;
        }

        alert(data.error || 'Không thể gửi bình luận');
    } catch (e) {
        console.error('Add comment error:', e);
    }
}

async function addReply(imageId, parentId) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để trả lời!');
        window.location.href = '/login.html';
        return;
    }
    const input = document.getElementById(`reply-input-${parentId}`);
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`/api/interactions/${imageId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, parentId })
        });

        const data = await res.json();

        if (res.ok) {
            input.value = '';
            document.getElementById(`reply-form-${parentId}`).style.display = 'none';
            loadComments(imageId);
            loadCommentCount(imageId);
            return;
        }

        alert(data.error || 'Không thể gửi phản hồi');
    } catch (e) {
        console.error('Add reply error:', e);
    }
}

async function deleteComment(commentId, imageId) {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
        const res = await fetch(`/api/interactions/comments/${commentId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            loadComments(imageId);
            loadCommentCount(imageId);
            return;
        }

        alert(data.error || 'Không thể xóa bình luận');
    } catch (e) {
        console.error('Delete comment error:', e);
    }
}

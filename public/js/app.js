// ==========================================
// FRONTEND JAVASCRIPT (Client-Side Logic)
// ==========================================
// File này xử lý tất cả logic phía client:
// gọi API, hiển thị dữ liệu, xử lý form.

// ---- BIẾN TOÀN CỤC ----
let currentUser = null;

// ==========================================
// KHỞI TẠO KHI TRANG ĐƯỢC LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    initImagePreview();

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
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
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
            <div class="image-card">
                <img class="previewable-image" src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.title)}" loading="lazy">
                <div class="card-body">
                    <h3>${escapeHtml(img.title)}</h3>
                    <p>${escapeHtml(img.description || '')}</p>
                </div>
                <div class="card-footer">
                    <span class="author">📸 ${escapeHtml(img.username)}</span>
                    <span class="date">${formatDate(img.created_at)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        grid.innerHTML = '<div class="empty-state"><h3>Lỗi khi tải ảnh</h3></div>';
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

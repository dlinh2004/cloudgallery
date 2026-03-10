// ==========================================
// SERVER CHÍNH (Entry Point)
// ==========================================
// File này khởi động Express server, cấu hình
// middleware, routes, và serve static files.

// Load biến môi trường từ file .env
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Khởi tạo Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ---- MIDDLEWARE ----

// Parse JSON body (cho các request gửi JSON)
app.use(express.json());

// Parse URL-encoded body (cho form submit truyền thống)
app.use(express.urlencoded({ extended: true }));

// Cấu hình session (lưu trạng thái đăng nhập)
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,    // Cookie không truy cập được từ JavaScript
        maxAge: 24 * 60 * 60 * 1000 // Cookie hết hạn sau 24 giờ
    }
}));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Đảm bảo thư mục uploads tồn tại
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---- ROUTES ----

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/images', require('./routes/images'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve HTML pages
// Trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Các trang HTML khác
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/gallery.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gallery.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// ---- KHỞI ĐỘNG SERVER ----
app.listen(PORT, () => {
    console.log('===========================================');
    console.log(`  Cloud Gallery Server`);
    console.log(`  Đang chạy tại: http://localhost:${PORT}`);
    console.log(`  Storage mode: ${process.env.STORAGE_MODE || 'local'}`);
    console.log('===========================================');
});

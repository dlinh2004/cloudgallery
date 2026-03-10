// ==========================================
// CONTROLLER XÁC THỰC (Auth Controller)
// ==========================================
// Xử lý logic đăng ký, đăng nhập, đăng xuất.

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ---- ĐĂNG KÝ (Register) ----
async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        // Kiểm tra input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Kiểm tra username hoặc email đã tồn tại chưa
        const existingResult = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingResult.rows.length > 0) {
            return res.status(400).json({ error: 'Username hoặc email đã được sử dụng' });
        }

        // Mã hóa mật khẩu trước khi lưu vào database
        // bcrypt tự động tạo salt và hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Lưu user mới vào database
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Lỗi server, vui lòng thử lại' });
    }
}

// ---- ĐĂNG NHẬP (Login) ----
async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập username và password' });
        }

        // Tìm user theo username
        const usersResult = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (usersResult.rows.length === 0) {
            return res.status(401).json({ error: 'Username hoặc password không đúng' });
        }

        const user = usersResult.rows[0];

        // So sánh password nhập vào với password đã hash trong DB
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Username hoặc password không đúng' });
        }

        // Lưu thông tin user vào session (KHÔNG lưu password)
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        res.json({ message: 'Đăng nhập thành công!', user: req.session.user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Lỗi server, vui lòng thử lại' });
    }
}

// ---- ĐĂNG XUẤT (Logout) ----
function logout(req, res) {
    // Hủy session
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Không thể đăng xuất' });
        }
        res.json({ message: 'Đăng xuất thành công!' });
    });
}

// ---- LẤY THÔNG TIN USER HIỆN TẠI ----
function getCurrentUser(req, res) {
    if (req.session && req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.json({ user: null });
    }
}

module.exports = { register, login, logout, getCurrentUser };

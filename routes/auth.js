// ==========================================
// ROUTES XÁC THỰC (Authentication Routes)
// ==========================================
// Định nghĩa các API endpoint cho đăng ký, đăng nhập, đăng xuất.

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register - Đăng ký tài khoản mới
router.post('/register', authController.register);

// POST /api/auth/login - Đăng nhập
router.post('/login', authController.login);

// POST /api/auth/logout - Đăng xuất
router.post('/logout', authController.logout);

// GET /api/auth/me - Lấy thông tin user đang đăng nhập
router.get('/me', authController.getCurrentUser);

module.exports = router;

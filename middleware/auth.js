// ==========================================
// MIDDLEWARE XÁC THỰC (Authentication)
// ==========================================
// Middleware này kiểm tra xem người dùng đã đăng nhập
// chưa trước khi cho phép truy cập các trang cần bảo vệ.

function isAuthenticated(req, res, next) {
    // Kiểm tra session có chứa thông tin user không
    if (req.session && req.session.user) {
        return next(); // Đã đăng nhập → cho đi tiếp
    }
    // API trả JSON để frontend xử lý, còn page request thì redirect như cũ.
    if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này' });
    }

    // Chưa đăng nhập → chuyển về trang login
    res.redirect('/login.html');
}

module.exports = { isAuthenticated };

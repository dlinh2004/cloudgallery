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
    // Chưa đăng nhập → chuyển về trang login
    res.redirect('/login.html');
}

module.exports = { isAuthenticated };

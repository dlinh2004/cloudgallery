// ==========================================
// CẤU HÌNH KẾT NỐI DATABASE (PostgreSQL)
// ==========================================
// File này tạo connection pool đến PostgreSQL.
// Khi chuyển sang AWS RDS, chỉ cần thay đổi
// các biến môi trường trong file .env

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    // Giới hạn số kết nối đồng thời
    max: 10
});

module.exports = pool;

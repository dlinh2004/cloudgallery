-- ==========================================
-- DATABASE SCHEMA cho Cloud Gallery
-- ==========================================
-- Chạy file này để tạo database và các bảng cần thiết

-- Tạo database (chạy riêng lệnh này trước trong psql hoặc pgAdmin):
-- CREATE DATABASE cloud_gallery;

-- Sau đó kết nối vào database cloud_gallery rồi chạy các lệnh bên dưới:

-- Bảng users: lưu thông tin người dùng
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng images: lưu thông tin ảnh đã upload
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

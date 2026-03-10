// ==========================================
// CONTROLLER ẢNH (Image Controller)
// ==========================================
// Xử lý logic upload, hiển thị, xóa ảnh.
// Hỗ trợ cả lưu local và lưu trên S3.

const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

// Import S3 helper (chỉ dùng khi STORAGE_MODE=s3)
let s3Helper = null;
if (process.env.STORAGE_MODE === 's3') {
    s3Helper = require('../config/s3');
}

// ---- UPLOAD ẢNH ----
async function uploadImage(req, res) {
    try {
        const { title, description } = req.body;
        const userId = req.session.user.id;

        // Kiểm tra có file được upload không
        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng chọn ảnh để upload' });
        }

        if (!title) {
            return res.status(400).json({ error: 'Vui lòng nhập tiêu đề ảnh' });
        }

        let imageUrl;

        if (process.env.STORAGE_MODE === 's3') {
            // ---- CHẾ ĐỘ S3: Upload file lên Amazon S3 ----
            imageUrl = await s3Helper.uploadToS3(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );
        } else {
            // ---- CHẾ ĐỘ LOCAL: Lưu file vào thư mục /public/uploads ----
            imageUrl = '/uploads/' + req.file.filename;
        }

        // Lưu thông tin ảnh vào database
        await pool.query(
            'INSERT INTO images (user_id, title, description, image_url) VALUES ($1, $2, $3, $4)',
            [userId, title, description || '', imageUrl]
        );

        res.status(201).json({ message: 'Upload ảnh thành công!', imageUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Lỗi khi upload ảnh' });
    }
}

// ---- LẤY TẤT CẢ ẢNH (Gallery) ----
async function getAllImages(req, res) {
    try {
        const result = await pool.query(
            `SELECT images.*, users.username 
             FROM images 
             JOIN users ON images.user_id = users.id 
             ORDER BY images.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get all images error:', error);
        res.status(500).json({ error: 'Lỗi khi tải danh sách ảnh' });
    }
}

// ---- LẤY ẢNH CỦA USER (Dashboard) ----
async function getUserImages(req, res) {
    try {
        const userId = req.session.user.id;
        const result = await pool.query(
            'SELECT * FROM images WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get user images error:', error);
        res.status(500).json({ error: 'Lỗi khi tải ảnh của bạn' });
    }
}

// ---- XÓA ẢNH ----
async function deleteImage(req, res) {
    try {
        const imageId = req.params.id;
        const userId = req.session.user.id;

        // Tìm ảnh và kiểm tra quyền sở hữu
        const imagesResult = await pool.query(
            'SELECT * FROM images WHERE id = $1 AND user_id = $2',
            [imageId, userId]
        );

        // Nếu không tìm thấy → không phải ảnh của user này
        if (imagesResult.rows.length === 0) {
            return res.status(403).json({ error: 'Bạn không có quyền xóa ảnh này' });
        }

        const image = imagesResult.rows[0];

        if (process.env.STORAGE_MODE === 's3') {
            // Xóa file trên S3
            await s3Helper.deleteFromS3(image.image_url);
        } else {
            // Xóa file local
            const filePath = path.join(__dirname, '..', 'public', image.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Xóa record trong database
        await pool.query('DELETE FROM images WHERE id = $1', [imageId]);

        res.json({ message: 'Xóa ảnh thành công!' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Lỗi khi xóa ảnh' });
    }
}

module.exports = { uploadImage, getAllImages, getUserImages, deleteImage };

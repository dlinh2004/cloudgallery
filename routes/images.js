// ==========================================
// ROUTES ẢNH (Image Routes)
// ==========================================
// Định nghĩa các API endpoint cho upload, xem, xóa ảnh.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const imageController = require('../controllers/imageController');
const { isAuthenticated } = require('../middleware/auth');

// ---- CẤU HÌNH MULTER (xử lý upload file) ----
let upload;

if (process.env.STORAGE_MODE === 's3') {
    // Chế độ S3: lưu file vào bộ nhớ tạm (buffer)
    // rồi upload lên S3 trong controller
    upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
        fileFilter: (req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png|gif|webp/;
            const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mime = allowedTypes.test(file.mimetype);
            if (ext && mime) {
                cb(null, true);
            } else {
                cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'));
            }
        }
    });
} else {
    // Chế độ Local: lưu file vào thư mục /public/uploads
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.join(__dirname, '..', 'public', 'uploads'));
        },
        filename: (req, file, cb) => {
            // Tạo tên file unique: timestamp + random + extension
            const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueName + path.extname(file.originalname));
        }
    });

    upload = multer({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png|gif|webp/;
            const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mime = allowedTypes.test(file.mimetype);
            if (ext && mime) {
                cb(null, true);
            } else {
                cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'));
            }
        }
    });
}

// POST /api/images/upload - Upload ảnh (cần đăng nhập)
router.post('/upload', isAuthenticated, upload.single('image'), imageController.uploadImage);

// GET /api/images - Lấy tất cả ảnh (gallery công khai)
router.get('/', imageController.getAllImages);

// GET /api/images/my - Lấy ảnh của user đang đăng nhập
router.get('/my', isAuthenticated, imageController.getUserImages);

// DELETE /api/images/:id - Xóa ảnh (chỉ chủ sở hữu)
router.delete('/:id', isAuthenticated, imageController.deleteImage);

module.exports = router;

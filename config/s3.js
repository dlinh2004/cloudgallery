// ==========================================
// CẤU HÌNH AWS S3 (Amazon Simple Storage Service)
// ==========================================
// File này cấu hình kết nối đến S3.
// Khi chạy trên EC2 với IAM Role, SDK sẽ tự động
// lấy credentials từ Instance Metadata Service.

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Tạo S3 client
// Nếu chạy trên EC2 với IAM Role, không cần khai báo credentials
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

// Upload file lên S3
async function uploadToS3(fileBuffer, fileName, mimeType) {
    const key = `images/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType
    });

    await s3Client.send(command);

    // Trả về URL công khai của file trên S3
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Xóa file khỏi S3
async function deleteFromS3(imageUrl) {
    // Lấy key từ URL
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1); // bỏ dấu / ở đầu

    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    });

    await s3Client.send(command);
}

module.exports = { uploadToS3, deleteFromS3 };

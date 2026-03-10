# ☁️ Cloud Gallery

Dự án web full-stack đơn giản để thực hành triển khai ứng dụng lên AWS.  
**Công nghệ:** Node.js + Express | PostgreSQL | HTML/CSS/JS  
**AWS Services:** EC2, RDS (PostgreSQL), S3, VPC, IAM

---

## 📁 Cấu trúc Project

```
CloudGallery/
├── config/
│   ├── db.js              ← Kết nối PostgreSQL (local hoặc RDS)
│   └── s3.js              ← Kết nối AWS S3
├── controllers/
│   ├── authController.js  ← Logic đăng ký, đăng nhập, đăng xuất
│   └── imageController.js ← Logic upload, xem, xóa ảnh
├── middleware/
│   └── auth.js            ← Middleware kiểm tra đăng nhập
├── public/
│   ├── css/style.css      ← Stylesheet
│   ├── js/app.js          ← Frontend JavaScript
│   └── uploads/           ← Thư mục lưu ảnh (chế độ local)
├── routes/
│   ├── auth.js            ← Routes cho authentication
│   └── images.js          ← Routes cho quản lý ảnh
├── views/
│   ├── index.html         ← Trang chủ
│   ├── login.html         ← Trang đăng nhập
│   ├── register.html      ← Trang đăng ký
│   ├── gallery.html       ← Trang xem tất cả ảnh
│   └── dashboard.html     ← Trang quản lý ảnh cá nhân
├── server.js              ← Entry point - khởi động server
├── schema.sql             ← SQL tạo database và bảng
├── package.json           ← Dependencies
├── .env                   ← Biến môi trường (KHÔNG commit lên git)
├── .env.example           ← Mẫu biến môi trường
└── .gitignore
```

---

## 🚀 PHẦN 1: Chạy trên máy Local

### Bước 1: Cài đặt yêu cầu

- **Node.js** (v18+): https://nodejs.org
- **PostgreSQL** (v15+): https://www.postgresql.org/download/
- **pgAdmin 4** (công cụ quản lý PostgreSQL): https://www.pgadmin.org/download/

### Bước 2: Tạo Database

**Cách 1: Dùng psql (command line)**

```bash
# Tạo database
psql -U postgres -c "CREATE DATABASE cloud_gallery;"

# Chạy schema
psql -U postgres -d cloud_gallery -f schema.sql
```

**Cách 2: Dùng pgAdmin 4 (giao diện đồ họa)**

1. Mở pgAdmin 4 → kết nối đến PostgreSQL server local
2. Click chuột phải vào **Databases** → **Create** → **Database** → đặt tên `cloud_gallery`
3. Click vào database `cloud_gallery` → **Tools** → **Query Tool**
4. Copy nội dung `schema.sql` vào và nhấn **Execute (F5)**:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Bước 3: Cấu hình biến môi trường

Mở file `.env` và sửa mật khẩu PostgreSQL:

```
DB_PASSWORD=your-postgres-password   ← Đổi thành mật khẩu PostgreSQL của bạn
```

### Bước 4: Cài đặt dependencies

```bash
cd CloudGallery
npm install
```

### Bước 5: Chạy server

```bash
npm start
```

Hoặc chạy ở chế độ dev (tự reload khi sửa code):

```bash
npm run dev
```

### Bước 6: Truy cập website

Mở trình duyệt: **http://localhost:3000**

---

## ☁️ PHẦN 2: Triển khai lên AWS

### Kiến trúc trên AWS

```
                    ┌─────────────┐
                    │   Internet  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  VPC (VPC)  │
                    │             │
          ┌─────────────────────────────┐
          │     Public Subnet           │
          │  ┌───────────────────┐      │
          │  │   EC2 Instance    │      │
          │  │   (Node.js App)   │      │
          │  │   + Nginx         │      │
          │  └────────┬──────────┘      │
          └───────────┼─────────────────┘
                      │
          ┌───────────┼─────────────────┐
          │     Private Subnet          │
          │  ┌────────▼──────────┐      │
          │  │  RDS (PostgreSQL) │      │
          │  │   (Database)      │      │
          │  └───────────────────┘      │
          └─────────────────────────────┘
                      │
               ┌──────▼──────┐
               │  S3 Bucket  │
               │  (Images)   │
               └─────────────┘
```

---

### BƯỚC 1: Tạo VPC (Virtual Private Cloud)

**Mục đích:** Tạo mạng riêng ảo để cô lập tài nguyên.

1. Vào **AWS Console** → **VPC** → **Create VPC**
2. Tạo VPC:
   - Name: `cloud-gallery-vpc`
   - IPv4 CIDR: `10.0.0.0/16`
3. Tạo **Public Subnet** (cho EC2):
   - CIDR: `10.0.1.0/24`
   - Availability Zone: `ap-southeast-1a`
   - Enable auto-assign public IP
4. Tạo **Private Subnet** (cho RDS):
   - CIDR: `10.0.2.0/24`
   - Availability Zone: `ap-southeast-1a`
5. Tạo thêm **Private Subnet 2** (RDS yêu cầu ít nhất 2 AZ):
   - CIDR: `10.0.3.0/24`
   - Availability Zone: `ap-southeast-1b`
6. Tạo **Internet Gateway** và attach vào VPC
7. Cập nhật **Route Table** của Public Subnet:
   - `0.0.0.0/0` → Internet Gateway

**Giải thích:**
- Public Subnet: EC2 nằm ở đây, có thể truy cập từ internet
- Private Subnet: RDS nằm ở đây, KHÔNG thể truy cập trực tiếp từ internet (bảo mật hơn)
- Chỉ EC2 trong cùng VPC mới kết nối được đến RDS

---

### BƯỚC 2: Tạo Security Groups

**Mục đích:** Firewall cho EC2 và RDS.

#### Security Group cho EC2 (`sg-ec2-web`):

| Type  | Port | Source        | Mô tả                    |
|-------|------|---------------|---------------------------|
| SSH   | 22   | My IP         | Chỉ cho bạn SSH vào      |
| HTTP  | 80   | 0.0.0.0/0     | Web traffic               |
| HTTPS | 443  | 0.0.0.0/0     | Secure web traffic        |
| Custom| 3000 | 0.0.0.0/0     | Node.js (dev/testing)     |

#### Security Group cho RDS (`sg-rds-postgresql`):

| Type       | Port | Source        | Mô tả                    |
|------------|------|---------------|---------------------------|
| PostgreSQL | 5432 | sg-ec2-web    | Chỉ cho EC2 kết nối      |

**Giải thích:** RDS chỉ cho phép kết nối từ EC2 (thông qua Security Group reference), không mở cho internet.

---

### BƯỚC 3: Tạo RDS Instance (PostgreSQL)

**Mục đích:** Thay thế PostgreSQL local bằng managed database trên cloud.

1. Vào **AWS Console** → **RDS** → **Create database**
2. Cấu hình:
   - Engine: **PostgreSQL**
   - Template: **Free tier**
   - DB instance identifier: `cloud-gallery-db`
   - Master username: `postgres`
   - Master password: (đặt password mạnh) N22dccn147
   - Instance class: `db.t3.micro` (free tier)
   - Storage: 20 GB gp2
   - VPC: `cloud-gallery-vpc`
   - Subnet group: Chọn 2 private subnets đã tạo
   - Public access: **No** (quan trọng!)
   - Security group: `sg-rds-postgresql`
   - Database name: `cloud_gallery`
3. Sau khi tạo xong, ghi lại **Endpoint** (ví dụ: `cloud-gallery-db.xxxx.ap-southeast-1.rds.amazonaws.com`)

**Giải thích:**
- **Public access = No**: RDS chỉ truy cập được từ bên trong VPC
- **Free tier eligible**: Không mất tiền trong 12 tháng đầu
- Sau khi RDS chạy, SSH vào EC2 và chạy `schema.sql` để tạo bảng

---

### BƯỚC 4: Tạo S3 Bucket

**Mục đích:** Lưu trữ ảnh upload trên cloud thay vì trên EC2.

1. Vào **AWS Console** → **S3** → **Create bucket**
2. Cấu hình:
   - Bucket name: `cloud-gallery-images-<your-id>` (tên phải unique toàn cầu)
   - Region: `ap-southeast-1`
   - **Bỏ chọn** "Block all public access" (vì ảnh cần được xem công khai)
3. Thêm **Bucket Policy** để cho phép đọc công khai:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::cloud-gallery-images-<your-id>/*"
        }
    ]
}
```

**Giải thích:**
- Bucket Policy cho phép bất kỳ ai đọc (xem) ảnh
- Nhưng chỉ IAM Role mới có quyền upload/xóa ảnh

---

### BƯỚC 5: Tạo IAM Role cho EC2

**Mục đích:** Cho phép EC2 tự động có quyền upload ảnh lên S3, không cần hard-code credential.

1. Vào **AWS Console** → **IAM** → **Roles** → **Create role**
2. Cấu hình:
   - Trusted entity type: **AWS service**
   - Use case: **EC2**
3. Attach policy:
   - Tạo custom policy hoặc dùng policy sẵn:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::cloud-gallery-images-<your-id>/*"
        }
    ]
}
```

4. Role name: `EC2-S3-Upload-Role`
5. Sau khi tạo, attach role vào EC2 instance:
   - EC2 → Actions → Security → Modify IAM Role → chọn `EC2-S3-Upload-Role`

**Giải thích:**
- IAM Role cho phép EC2 "tự động" có quyền truy cập S3
- AWS SDK (trong code Node.js) sẽ tự động lấy credentials từ EC2 metadata
- KHÔNG cần hard-code Access Key/Secret Key trong code → bảo mật hơn

---

### BƯỚC 6: Tạo EC2 Instance

**Mục đích:** Server để chạy ứng dụng Node.js.

1. Vào **AWS Console** → **EC2** → **Launch Instance**
2. Cấu hình:
   - Name: `cloud-gallery-server`
   - AMI: **Amazon Linux 2023** hoặc **Ubuntu 22.04**
   - Instance type: `t2.micro` (free tier)
   - Key pair: Tạo mới hoặc dùng key pair sẵn có
   - Network: `cloud-gallery-vpc`, Public Subnet
   - Security group: `sg-ec2-web`
   - IAM Role: `EC2-S3-Upload-Role`

---

### BƯỚC 7: Cài đặt trên EC2

SSH vào EC2:

```bash
ssh -i your-key.pem ec2-user@<EC2-Public-IP>
```

Cài đặt Node.js và PostgreSQL client:

```bash
# Cập nhật hệ thống
sudo yum update -y            # Amazon Linux
# sudo apt update -y          # Ubuntu

# Cài Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs    # Amazon Linux
# sudo apt install -y nodejs  # Ubuntu

# Cài Git
sudo yum install -y git       # Amazon Linux
# sudo apt install -y git     # Ubuntu

# Cài PostgreSQL Client (để chạy schema.sql trên RDS)
sudo yum install -y postgresql15    # Amazon Linux
# sudo apt install -y postgresql-client  # Ubuntu

# Kiểm tra version
node -v
npm -v
```

Clone code và cài đặt:

```bash
# Clone project (hoặc upload bằng SCP)
git clone <your-repo-url>
cd CloudGallery

# Cài dependencies
npm install
```

Tạo bảng trên RDS:

```bash
# Kết nối đến RDS từ EC2 và chạy schema
PGPASSWORD=<rds-password> psql -h cloud-gallery-db.xxxx.rds.amazonaws.com -U postgres -d cloud_gallery -f schema.sql
```

---

### BƯỚC 8: Cấu hình .env trên EC2

Tạo file `.env` trên EC2 với thông tin AWS:

```bash
nano .env
```

```
PORT=3000
SESSION_SECRET=<tạo-chuỗi-ngẫu-nhiên-dài>

# Kết nối đến RDS (thay vì localhost)
DB_HOST=cloud-gallery-db.xxxx.ap-southeast-1.rds.amazonaws.com
DB_USER=postgres
DB_PASSWORD=<rds-password>
DB_NAME=cloud_gallery
DB_PORT=5432

# Chuyển sang lưu ảnh trên S3
STORAGE_MODE=s3
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=cloud-gallery-images-<your-id>
```

**Thay đổi so với local:**
| Cấu hình       | Local                | AWS                          |
|-----------------|----------------------|------------------------------|
| DB_HOST         | localhost            | RDS Endpoint                 |
| DB_USER         | postgres             | postgres                     |
| STORAGE_MODE    | local                | s3                           |
| AWS_S3_BUCKET   | (không cần)          | Tên S3 bucket                |

---

### BƯỚC 9: Chạy ứng dụng trên EC2

```bash
# Chạy trực tiếp
npm start

# HOẶC dùng PM2 để chạy ổn định (tự restart nếu crash)
sudo npm install -g pm2
pm2 start server.js --name cloud-gallery
pm2 save
pm2 startup    # Tự chạy lại khi EC2 reboot
```

**Cài Nginx làm reverse proxy (tùy chọn nhưng nên làm):**

```bash
sudo yum install -y nginx     # Amazon Linux
# sudo apt install -y nginx   # Ubuntu

# Cấu hình Nginx
sudo nano /etc/nginx/conf.d/cloud-gallery.conf
```

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

Truy cập: **http://<EC2-Public-IP>**

---

## 🔍 PHẦN 3: Giải thích Code chi tiết

### Luồng hoạt động (Flow)

```
Người dùng ──→ [Frontend HTML/JS]
                     │
                     │ fetch() API call
                     ▼
              [Express Server]
                     │
              ├── /api/auth/*      → authController.js
              │   ├── register     → Hash password → INSERT vào PostgreSQL
              │   ├── login        → So sánh hash → Tạo session
              │   └── logout       → Hủy session
              │
              └── /api/images/*    → imageController.js
                  ├── upload       → Multer xử lý file → Lưu local/S3 → INSERT vào PostgreSQL
                  ├── GET /        → SELECT tất cả ảnh
                  ├── GET /my      → SELECT ảnh của user
                  └── DELETE /:id  → Kiểm tra quyền → Xóa file + record
```

### Bảo mật trong code

| Tính năng             | Cách thực hiện                                      |
|-----------------------|-----------------------------------------------------|
| Hash password         | `bcrypt.hash(password, 10)` - mã hóa không thể đảo ngược |
| Session-based auth    | `express-session` lưu trạng thái đăng nhập phía server |
| XSS Protection        | `escapeHtml()` trong frontend, không render raw HTML |
| Kiểm tra quyền xóa   | Kiểm tra `user_id` trước khi xóa ảnh               |
| File type validation  | Multer `fileFilter` chỉ cho phép ảnh                |
| SQL Injection         | Sử dụng parameterized queries (`$1, $2` placeholder) |

### Sự khác nhau giữa Local và AWS

| Thành phần   | Local                         | AWS                              |
|--------------|-------------------------------|----------------------------------|
| Web Server   | `localhost:3000`              | EC2 instance (public IP)         |
| Database     | PostgreSQL trên máy           | Amazon RDS PostgreSQL (private subnet) |
| Lưu ảnh      | `/public/uploads/`           | Amazon S3 bucket                 |
| Mạng         | Mạng local                   | VPC với public/private subnet    |
| Quyền S3     | Không áp dụng                | IAM Role gắn vào EC2            |

Code KHÔNG cần sửa khi chuyển sang AWS — chỉ cần thay đổi file `.env`.

---

## 💰 Chi phí ước tính (Free Tier)

| Service    | Free Tier                          |
|------------|-------------------------------------|
| EC2        | 750 giờ/tháng t2.micro (12 tháng) |
| RDS        | 750 giờ/tháng db.t3.micro (12 tháng)|
| S3         | 5 GB storage + 20,000 GET requests |

**Lưu ý:** Nhớ tắt/xóa resources sau khi thực hành để tránh phát sinh chi phí!

---

## 📝 Tóm tắt những gì bạn học được

1. **EC2**: Deploy Node.js app, cài đặt PM2, Nginx reverse proxy
2. **RDS**: Managed PostgreSQL database, đặt trong private subnet
3. **S3**: Lưu trữ file, Bucket Policy, public read access
4. **VPC**: Public/Private subnet, Internet Gateway, Security Groups
5. **IAM**: Role-based access, EC2 instance profile, least privilege principle


http://18.143.169.192:3000/
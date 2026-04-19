# Cloud Gallery

Cloud Gallery is a production-style full-stack social photo platform built to demonstrate practical cloud engineering skills, not just local development.

It showcases how to design, secure, and deploy a Node.js application on AWS with a private database tier, object storage, session-based authentication, and social interaction features (likes, threaded comments, friends, notifications).



## Recruiter Snapshot

- Designed and deployed a multi-tier web application on AWS using EC2, RDS PostgreSQL (private subnet), S3, VPC, IAM, and Security Groups.
- Built a full-stack social media style product with authentication, image management, interactions, friend requests, and notification workflows.
- Implemented secure backend patterns: password hashing, parameterized SQL queries, session-based auth, ownership checks, and restricted network paths between app and database.
- Engineered environment-based storage architecture (local and S3 modes) to support both local development and cloud deployment with minimal code changes.

## Tech Stack

- Backend: Node.js, Express
- Database: PostgreSQL
- Authentication: express-session, bcryptjs
- File Handling: Multer
- Cloud: AWS EC2, AWS RDS (PostgreSQL), AWS S3, VPC, IAM, Security Groups
- Frontend: HTML, CSS, Vanilla JavaScript

## Core Features

- User registration, login, logout, and session persistence
- Personal dashboard for image upload and management
- Public gallery feed with image metadata
- Image interactions: likes and nested comments/replies
- Notification center for likes, comments, replies, and friend requests
- Friend system: search by email, send/accept/reject requests, friend list
- Presence tracking (online/offline heartbeat with last seen)

## Architecture Overview

```text
Internet
   |
Nginx (reverse proxy)
   |
EC2 (Node.js + Express app)
   |
+-------------------------+
| VPC                     |
|  - Public subnet: EC2   |
|  - Private subnet: RDS  |
+-------------------------+
   |
RDS PostgreSQL (private access only)

S3 bucket (image objects)
   ^
   |
EC2 IAM role grants controlled upload/delete permissions
```

## Security Highlights

- Passwords are hashed with bcrypt before database storage.
- Session cookies are httpOnly with controlled lifetime.
- SQL queries use placeholders to mitigate SQL injection risk.
- Ownership validation is enforced for destructive actions (delete image/comment).
- RDS is intended to run in private subnets with no public access.
- S3 access is controlled through IAM role permissions instead of hard-coded secrets.

## Database Schema (High Level)

Main entities:

- users
- images
- likes
- comments (supports parent-child replies)
- notifications
- friendships
- messages
- user_presence

See schema.sql for complete DDL and indexes.

## Project Structure

```text
CloudGallery/
|- config/
|  |- db.js
|  |- s3.js
|- controllers/
|  |- authController.js
|  |- imageController.js
|  |- interactionController.js
|  |- notificationController.js
|  |- friendController.js
|- middleware/
|  |- auth.js
|- routes/
|  |- auth.js
|  |- images.js
|  |- interactions.js
|  |- notifications.js
|  |- friends.js
|- public/
|- views/
|- schema.sql
|- server.js
|- package.json
```

## Run Locally

### 1) Prerequisites

- Node.js 18+
- PostgreSQL 15+

### 2) Create database and schema

```bash
psql -U postgres -c "CREATE DATABASE cloud_gallery;"
psql -U postgres -d cloud_gallery -f schema.sql
```

### 3) Configure environment variables

Create a .env file in the project root:

```env
PORT=3000
SESSION_SECRET=replace_with_a_long_random_secret

DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=cloud_gallery
DB_PORT=5432

STORAGE_MODE=local
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your_bucket_name_if_using_s3
```

### 4) Install and run

```bash
npm install
npm run dev
```

Open: http://localhost:3000

## Deploy on AWS (Summary)

1. Create VPC with one public subnet (EC2) and private subnets (RDS).
2. Create Security Groups:
   - EC2: allow SSH/HTTP/HTTPS
   - RDS: allow PostgreSQL only from EC2 Security Group
3. Provision PostgreSQL on RDS with public access disabled.
4. Create S3 bucket for images and apply least-privilege access policy.
5. Create IAM role for EC2 with S3 object upload/delete permissions.
6. Launch EC2, install Node.js, clone project, configure .env.
7. Run schema.sql against RDS.
8. Start app with PM2 and place Nginx in front as reverse proxy.

## Why This Project Stands Out

This project demonstrates hands-on capability across application development and cloud operations:

- Application engineering: API design, session auth, relational modeling, and feature-rich backend logic.
- Cloud architecture: private/public subnet separation, secure database access, object storage integration, and IAM-based permissions.
- Production thinking: environment-driven config, process management with PM2, reverse proxying with Nginx, and security-first defaults.



## Threads Clone — CLAUDE.md

## Tech Stack

Frontend: Next.js 14, TailwindCSS (port 3000)
Backend: Node.js, Express (port 5000)
Database: PostgreSQL + Prisma ORM
Realtime: Socket.io
Media: Cloudinary
Auth: JWT access token (15 phút) + refresh token (7 ngày)
AI: Anthropic API

## Cấu trúc

threads-clone/
├── frontend/ (Next.js)
└── backend/ (Express)
└── src/
├── modules/auth/
├── modules/posts/
├── modules/users/
├── middlewares/
└── utils/

## Quy ước code

Response format: { success: true/false, data: {}, message: "" }
Lỗi: throw new AppError(message, statusCode)
API prefix: /api/v1

## Đã hoàn thành ✅

Học async/await + fetch API
Học React: component, useState, useEffect
Setup project structure
Backend Express chạy port 5000
Frontend Next.js chạy port 3000
Cài PostgreSQL 18.4
Tạo database threads_db
Setup Prisma v5
Tạo toàn bộ 14 bảng database
Setup GitHub repo + .gitignore
Auth API: register, login, refresh token, logout
Auth Frontend: login page, register page, middleware
Post API: tạo/sửa/xóa/like/comment/save
Feed API: cursor pagination + privacy
Newsfeed UI: PostCard, CreatePost, Infinite scroll
User API + Follow API + Search API
Profile page: cover, avatar, stats, tab Bài viết/Đã lưu
Edit Profile page: cập nhật displayName, bio, avatar, cover
Search page: debounce 500ms, tab Tất cả/Người dùng/Bài viết/Hashtag
Friends page: tab Lời mời/Bạn bè/Gợi ý
UserCard component: Follow/Unfollow với optimistic update

## Đang làm — Ngày 6

Notification system (backend: model + controller + routes)
Socket.io real-time notifications
NotificationBell component (badge + dropdown)
Notifications page (danh sách, đánh dấu đã đọc)

## Ghi chú

Desktop path: /c/Users/PC/OneDrive/Desktop/threads-clone
Mở backend: cd backend && npm run dev
Mở frontend: cd frontend && npm run dev

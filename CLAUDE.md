## Threads Clone — CLAUDE.md

## Tech Stack

Frontend: Next.js 14, TailwindCSS (port 3000)
Backend: Node.js, Express (port 5000)
Database: PostgreSQL + Prisma ORM
Realtime: Socket.io
Media: Cloudinary
Auth: JWT access token (15 phút) + refresh token (7 ngày)
AI: Anthropic API (claude-haiku-4-5)

## Cấu trúc

threads-clone/
├── frontend/ (Next.js)
└── backend/ (Express)
└── src/
├── modules/auth/
├── modules/posts/
├── modules/users/
├── modules/notifications/
├── modules/media/
├── modules/ai/
├── socket/
├── config/
├── middlewares/
└── utils/

## Quy ước code

Response format: { success: true/false, data: {}, message: "" }
Lỗi: throw new AppError(message, statusCode)
API prefix: /api/v1

## Đã hoàn thành ✅

✅ Học async/await + fetch API
✅ Học React: component, useState, useEffect
✅ Setup project structure
✅ Backend Express chạy port 5000
✅ Frontend Next.js chạy port 3000
✅ Cài PostgreSQL 18.4
✅ Tạo database threads_db
✅ Setup Prisma v5
✅ Tạo toàn bộ 14 bảng database + UserSettings
✅ Setup GitHub repo + .gitignore
✅ Auth API: register, login, refresh token, logout
✅ Auth Frontend: login page, register page, middleware
✅ Post API: tạo/sửa/xóa/like/comment/save
✅ Feed API: cursor pagination + privacy
✅ Newsfeed UI: PostCard, CreatePost, Infinite scroll
✅ User API + Follow API + Search API
✅ Profile page: cover, avatar, stats, tab Bài viết/Đã lưu
✅ Edit Profile page: cập nhật displayName, bio, avatar, cover
✅ Search page: debounce 500ms, tab Tất cả/Người dùng/Bài viết/Hashtag
✅ Friends page: tab Lời mời/Bạn bè/Gợi ý
✅ UserCard component: Follow/Unfollow với optimistic update
✅ Notification system: model + controller + routes
✅ Socket.io: JWT auth, room per user, singleton
✅ NotificationBell: badge real-time, dropdown desktop, icon mobile
✅ Notifications page: infinite scroll, mark read, xóa, navigate
✅ Cloudinary config + multer middleware (image/video/multiple)
✅ Media API: upload-image, upload-multiple, upload-video, delete
✅ MediaUpload component: drag & drop, progress bar, preview, retry
✅ CreatePost: tích hợp media upload, cleanup khi lỗi
✅ PostCard: grid layout 1-4 ảnh, video player
✅ Anthropic config: singleton client, claude-haiku-4-5
✅ AI Service: generateCaption, suggestHashtags, moderateContent
✅ AI API: rate limit 20 req/giờ/user, hook moderation vào post
✅ CaptionGenerator: 3 gợi ý, chọn tone, fade-in animation
✅ HashtagSuggester: debounce 1000ms, chip violet, click thêm/bỏ
✅ CreatePost: tích hợp AI caption + hashtag, cảnh báo vi phạm
✅ Settings page: đổi mật khẩu, privacy, notifications (sidebar desktop / tabs mobile)
✅ Dark mode: class-based, localStorage, script inline tránh FOUC
✅ PWA: manifest.json + service worker (network-first API, cache-first static)

## Đang làm — Ngày 10

Direct Messages UI
Conversation list
Real-time chat với Socket.io

## Ghi chú

Desktop path: /c/Users/PC/OneDrive/Desktop/threads-clone
Mở backend: cd backend && npm run dev
Mở frontend: cd frontend && npm run dev
Cần ANTHROPIC_API_KEY trong backend/.env

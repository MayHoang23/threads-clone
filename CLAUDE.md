# Threads Clone — CLAUDE.md

## Tech Stack

- Frontend: Next.js 14, TailwindCSS (port 3000)
- Backend: Node.js, Express (port 5000)
- Database: PostgreSQL + Prisma ORM
- Realtime: Socket.io
- Media: Cloudinary
- Auth: JWT access token (15 phút) + refresh token (7 ngày)
- AI: Anthropic API

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

- Response format: { success: true/false, data: {}, message: "" }
- Lỗi: throw new AppError(message, statusCode)
- API prefix: /api/v1

## Đã hoàn thành ✅

- [x] Học async/await + fetch API
- [x] Học React: component, useState, useEffect
- [x] Setup project structure
- [x] Backend Express chạy port 5000
- [x] Frontend Next.js chạy port 3000
- [x] Cài PostgreSQL 18.4
- [x] Tạo database threads_db
- [x] Setup Prisma v5
- [x] Tạo toàn bộ 14 bảng database
- [x] Setup GitHub repo + .gitignore
- [x] Auth API: register, login, refresh token, logout
- [x] Auth Frontend: login page, register page, middleware

## Ngày mai — Ngày 4

- [ ] Post API: tạo, sửa, xóa bài viết
- [ ] Feed API: lấy bài viết theo thời gian
- [ ] Like + Comment API
- [ ] UI: Newsfeed page + Post card component

## Ghi chú

- Desktop path: /c/Users/PC/OneDrive/Desktop/threads-clone
- Mở backend: cd backend && npm run dev
- Mở frontend: cd frontend && npm run dev

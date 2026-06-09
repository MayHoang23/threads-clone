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
│ ├── app/
│ │ ├── (main)/
│ │ │ ├── page.js (newsfeed)
│ │ │ ├── profile/[username]/page.js
│ │ │ ├── profile/edit/page.js
│ │ │ ├── search/page.js
│ │ │ ├── friends/page.js
│ │ │ ├── notifications/page.js
│ │ │ ├── settings/page.js
│ │ │ └── messages/page.js
│ │ └── layout.js
│ ├── components/
│ │ ├── post/PostCard.js, CreatePost.js, MediaUpload.js
│ │ ├── user/UserCard.js
│ │ ├── notifications/NotificationBell.js
│ │ ├── ai/CaptionGenerator.js, HashtagSuggester.js
│ │ ├── messages/ConversationList.js, ChatWindow.js, MessageInput.js
│ │ ├── layout/Navbar.js
│ │ └── ui/ThemeToggle.js
│ ├── contexts/AuthContext.js, ThemeContext.js, SocketContext.js
│ ├── lib/
│ │ ├── api.js
│ │ ├── auth.js
│ │ └── socket.js ← singleton, connect 1 lần qua SocketContext
│ └── public/manifest.json, sw.js
└── backend/ (Express)
└── src/
├── modules/auth/
├── modules/posts/
├── modules/users/
├── modules/notifications/
├── modules/media/
├── modules/ai/ ← MOCK_MODE = true (chưa có Anthropic credit)
├── modules/messages/
├── socket/socketManager.js ← dùng JWT_REFRESH_SECRET cho socket auth
├── config/cloudinary.js, anthropic.js
├── middlewares/authenticate.js, upload.js
└── utils/AppError.js

## Quy ước code

Response format: { success: true/false, data: {}, message: "" }
Lỗi: throw new AppError(message, statusCode)
API prefix: /api/v1
File extension: .js (không dùng TypeScript)
Auth header: Bearer token (middleware authenticate.js)

## Custom Events (window)

Dùng window.dispatchEvent để giao tiếp giữa các component không có prop drilling:

| Event name       | Detail         | Mô tả                                     |
| ---------------- | -------------- | ----------------------------------------- |
| open-create-post | (không có)     | Mở modal CreatePost từ bất kỳ đâu         |
| post-created     | newPost object | Prepend bài mới vào newsfeed sau khi đăng |

Pattern dùng:

```js
// Dispatch
window.dispatchEvent(new CustomEvent("post-created", { detail: newPost }));

// Listen
useEffect(() => {
    const handler = (e) => doSomething(e.detail);
    window.addEventListener("post-created", handler);
    return () => window.removeEventListener("post-created", handler);
}, []);
```

## Thay đổi component quan trọng

### CreatePost.js

- Prop `modal` (bool, default `false`):
    - `modal=false`: render inline trên newsfeed (mặc định, không nghe event)
    - `modal=true`: ẩn cho đến khi nhận event `open-create-post`, render overlay modal (z-50, backdrop)
- Sau khi đăng thành công: dispatch `post-created` với detail là newPost object
- Vẫn gọi prop `onPostCreated` nếu được truyền vào

### Navbar.js (components/layout/Navbar.js)

- Mount `<CreatePost currentUser={currentUser} modal={true} />` globally trong fragment
- Nút "Tạo bài": không dùng Link, dùng `<button>` dispatch `open-create-post`
- Không có route /compose — đã xóa

### app/(main)/page.js (newsfeed)

- Lắng nghe event `post-created` để prepend bài mới lên đầu feed
- Không cần refetch toàn bộ feed sau khi đăng bài

## Database — Prisma models hiện có

User, Post, Like, Comment, Save, Follow,
Notification, UserSettings, RefreshToken,
Conversation (lastMessageAt), Message (content, mediaUrl, isRead)

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
✅ Direct Messages: Conversation + Message models, CRUD API
✅ Socket.io chat: join/leave conversation, typing indicator, read receipt
✅ ConversationList: preview, unread badge, real-time new_dm
✅ ChatWindow: date grouping, optimistic send, typing indicator, read receipt
✅ MessageInput: auto-resize, debounce typing, Enter/Shift+Enter
✅ SocketContext: singleton, connect 1 lần ở layout level

## Bugs đã fix

### Ngày 11

✅ Socket reconnect loop → SocketContext provider (singleton tại layout level)
✅ Cloudinary credentials trống → đã điền .env
✅ AI mock mode → MOCK_MODE = true trong ai.service.js
✅ CreatePost toolbar blur collapse → setTimeout 200ms
✅ Navbar profile link /profile/undefined → useMemo với currentUser
✅ Message duplicate → guard senderId !== currentUser.id trong socket handler
✅ Nút "Nhắn tin" thiếu trên profile page → đã thêm
✅ Modal tạo conversation mới (✏️ button) → đã fix
✅ Field name mismatch participantId → userId
✅ useSocket() gọi trong useEffect → chuyển lên top level của component

### Ngày 12

✅ Navbar "Tạo bài" → /compose 404 → đổi thành button dispatch custom event + modal
✅ Modal CreatePost không update newsfeed → custom event 'post-created' + listener ở page.js

## Còn lại

🔧 Real-time message giữa 2 user:

- Triệu chứng: join_conversation event không đến được backend handler
- Nghi ngờ: JWT_REFRESH_SECRET sai hoặc socket auth fail silently
- Cần debug: log socket.on('error') và middleware auth ở socketManager.js
  🔧 Search page — chưa test
  🔧 Dark mode — chưa test toàn bộ trang
  🔧 Settings — chưa test form đổi mật khẩu + privacy
  🚀 Deploy lên Railway (backend) + Vercel (frontend)

## Ghi chú

Desktop path: /c/Users/PC/OneDrive/Desktop/threads-clone
Mở backend: cd backend && npm run dev
Mở frontend: cd frontend && npm run dev
Socket dùng refreshToken (7 ngày) thay vì accessToken (15 phút)
Backend socket verify bằng JWT_REFRESH_SECRET
AI đang MOCK_MODE — cần thêm credit Anthropic để dùng thật
Sau Prisma migration: restart backend (EPERM DLL issue trên Windows)
Route /compose không tồn tại và không cần tạo

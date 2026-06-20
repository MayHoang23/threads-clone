# Kiến trúc hệ thống — Threads Clone

Tài liệu mô tả kiến trúc tổng quan, các luồng xử lý chính, cách tổ chức backend/frontend và các biện pháp bảo mật của dự án.

---

## 1. Sơ đồ kiến trúc tổng quan

```
                         ┌─────────────────────────────────────────┐
                         │            CLIENT (Next.js 14)            │
                         │              App Router · :3000           │
                         │                                           │
                         │   Pages ── Components ── Context API       │
                         │   (Auth / Theme / Socket / Language)       │
                         └───────────────┬───────────────┬───────────┘
                                         │               │
                          REST (fetch)   │               │  WebSocket
                          Bearer JWT     │               │  (Socket.io client)
                                         │               │
                                         ▼               ▼
                         ┌─────────────────────────────────────────┐
                         │          SERVER (Express · :5000)         │
                         │                                           │
                         │   helmet → cors → json → routes           │
                         │   /api/v1/*  (Controller → Service)        │
                         │                                           │
                         │   Socket.io server (cùng HTTP server)      │
                         │   - room user_<id>  (notif + DM badge)     │
                         │   - room conversation_<id> (chat realtime) │
                         └───┬───────────────┬──────────────┬────────┘
                             │               │              │
                 Prisma ORM  │       SDK     │      HTTPS    │
                             ▼               ▼              ▼
                  ┌──────────────────┐ ┌────────────┐ ┌──────────────┐
                  │   PostgreSQL      │ │ Cloudinary │ │  Gemini API  │
                  │  (18 models)      │ │ (ảnh/video)│ │ (caption,    │
                  │  qua Prisma       │ │            │ │  hashtag,    │
                  │                   │ │            │ │  moderation) │
                  └──────────────────┘ └────────────┘ └──────────────┘
```

- **Client (Next.js)**: render UI, giữ token trong `localStorage` + cookie, gọi REST API và mở 1 kết nối Socket.io duy nhất (singleton ở layer layout).
- **Server (Express)**: expose REST API dưới prefix `/api/v1`, đồng thời chạy Socket.io trên **cùng một HTTP server** (dùng `http.createServer(app)` thay vì `app.listen`).
- **PostgreSQL + Prisma**: nguồn dữ liệu chính, truy cập qua Prisma Client (singleton).
- **Cloudinary**: lưu trữ ảnh/video; backend chỉ nhận URL đã upload hoặc upload hộ qua module `media`.
- **Gemini API** (`gemini-2.5-flash`): sinh caption, gợi ý hashtag, kiểm duyệt nội dung.

---

## 2. Các luồng request chính

### 2.1 Auth flow (JWT access + refresh)

```
[Đăng ký]  POST /auth/register
   → tạo User (password hash bcrypt) → gửi email xác thực (hoặc bỏ qua nếu SKIP_EMAIL_VERIFY)

[Đăng nhập] POST /auth/login  { email, password }
   → so khớp bcrypt → kiểm tra isBanned + emailVerified
   → cấp accessToken (JWT, 15 phút) + refreshToken (JWT, 7 ngày)
   → client lưu localStorage + cookie accessToken (cho Next.js middleware)

[Đăng nhập Google] POST /auth/google  { access_token }
   → backend gọi Google userinfo bằng access_token → lấy email/name/picture
   → email đã tồn tại: đăng nhập + set emailVerified; chưa có: tạo user mới (password = null)
   → cấp access + refresh token như login thường

[Gọi API cần auth]
   → header  Authorization: Bearer <accessToken>
   → middleware authenticate verify JWT_SECRET → gắn req.user

[Hết hạn access token] POST /auth/refresh-token  { refreshToken }
   → verify JWT_REFRESH_SECRET → cấp accessToken mới (không cần đăng nhập lại)
```

Access token ngắn hạn để giảm rủi ro lộ token; refresh token dài hạn được dùng để gia hạn, **đồng thời** dùng cho xác thực Socket.io.

### 2.2 Post creation flow (media → Cloudinary → Post → AI moderation → notification)

```
1. Client upload media trước:
   POST /media/upload-image | /upload-multiple | /upload-video  (multipart, cần auth)
   → Cloudinary trả về URL

2. Client tạo bài:
   POST /posts  { content, privacy, mediaUrls[], linkUrl... }
   → post.service:
       a. (AI moderation) kiểm duyệt nội dung qua Gemini → nếu vi phạm thì cảnh báo/chặn
       b. tạo Post + Media + liên kết Hashtag (parse #tag trong content)
       c. nếu có mention/tương tác → tạo Notification + bắn realtime

3. Tương tác sau đó (like/comment/repost/follow):
   → ghi DB → tạo Notification → socket emit "new_notification" tới room user_<receiverId>
```

### 2.3 Realtime flow (Socket.io)

```
[Kết nối]
   client connect kèm handshake.auth.token = refreshToken (hoặc accessToken)
   → server io.use() verify JWT (thử JWT_SECRET, fallback JWT_REFRESH_SECRET)
   → socket.userId được gắn → tự join room  user_<userId>

[Notification realtime]
   server sendNotification(receiverId)  → emit "new_notification" vào user_<receiverId>

[Direct message realtime]
   client emit "join_conversation" { conversationId }
       → server xác minh là member → join room conversation_<id>
   gửi tin: POST /conversations/:id/messages (REST ghi DB)
       → server emitToConversation(...) "new_message" vào room
       → sendDMNotification(...) "new_dm" tới room cá nhân (update badge)
   "typing" / "stop_typing"  → broadcast "user_typing" / "user_stop_typing" cho người còn lại
   "leave_conversation"      → rời room khi đóng chat
```

---

## 3. Kiến trúc backend — pattern Controller + Service

Mỗi module backend tách theo lớp:

```
*.routes.js      → khai báo path + middleware (authenticate, rate limit, upload)
*.controller.js  → đọc req (params/body/query), gọi service, format response chuẩn, next(err)
*.service.js     → toàn bộ business logic + truy cập Prisma; ném AppError khi lỗi nghiệp vụ
```

**Vì sao tách lớp:**

- **Separation of concerns**: controller chỉ lo HTTP (input/output), service chỉ lo nghiệp vụ + dữ liệu. Đổi giao thức (vd thêm GraphQL/CLI) chỉ cần controller mới, tái dùng service.
- **Testability**: service là hàm thuần nghiệp vụ, test được độc lập không cần dựng HTTP (như test `googleLogin` chỉ stub phần gọi Google). Controller mỏng nên ít cần test.
- **Tái sử dụng**: 1 service có thể được gọi từ nhiều nơi — vd `post.service` gọi AI moderation; `story.service.deleteExpiredStories` được cron job gọi trực tiếp, không qua HTTP.
- **Xử lý lỗi tập trung**: service ném `AppError(message, statusCode)`; controller `next(err)`; **global error handler** ở `index.js` chuẩn hóa về `{ success, data, message }`.

**Quy ước chung:**

- Response: `{ success: boolean, data: object|null, message: string }`
- Lỗi nghiệp vụ: `throw new AppError(message, statusCode)` (`isOperational = true`)
- Prefix API: `/api/v1`
- File `.js` thuần (không TypeScript)

---

## 4. Kiến trúc frontend

### 4.1 Next.js App Router

- Thư mục `app/` với route groups:
  - `(auth)/` — `login`, `register` (layout riêng, bọc `GoogleOAuthProvider`)
  - `(main)/` — newsfeed, profile, search, friends, notifications, settings, messages, stories... (layout có Navbar + Sidebar + `Toaster`)
- `middleware.js` đọc cookie `accessToken` để chặn/đẩy hướng route cần đăng nhập (server-side), kèm lớp kiểm tra phía client trong `(main)/layout.js`.

### 4.2 Context API

| Context           | Vai trò                                                        |
| ----------------- | ------------------------------------------------------------- |
| `AuthContext`     | thông tin user hiện tại, trạng thái đăng nhập                  |
| `ThemeContext`    | dark/light mode (class-based, init từ DOM tránh FOUC)         |
| `SocketContext`   | giữ **1 instance Socket.io duy nhất** (connect ở layout level) |
| `LanguageContext` | đa ngôn ngữ (vi/en/zh) qua `lib/translations/*`               |

### 4.3 Custom events pattern (giao tiếp không prop-drilling)

Dùng `window.dispatchEvent(new CustomEvent(...))` + `addEventListener` để đồng bộ state giữa các component/trang rời rạc:

| Event              | Detail                          | Mô tả                                    |
| ------------------ | ------------------------------- | ---------------------------------------- |
| `open-create-post` | (không có)                      | Mở modal CreatePost từ bất kỳ đâu        |
| `post-created`     | newPost object                  | Prepend bài mới lên đầu newsfeed         |
| `post-saved`       | post object                     | Sync khi lưu bài                         |
| `post-unsaved`     | post object                     | Sync khi bỏ lưu bài                      |
| `follow-changed`   | `{ username, isFollowing }`     | Sync trạng thái follow cross-page        |
| `repost-changed`   | `{ postId, isReposted }`        | Sync trạng thái repost giữa các card     |
| `post-pin-changed` | `{ postId, isPinned }`          | Sync bài ghim trên profile               |

> Realtime DM/notification dùng Socket.io (`new_message`, `new_dm`, `new_notification`, `user_typing`), còn custom events ở trên là cơ chế nội bộ trong client để đồng bộ UI.

---

## 5. Bảo mật

- **JWT 2 tầng**: access token (15') ký bằng `JWT_SECRET`; refresh token (7 ngày) ký bằng `JWT_REFRESH_SECRET`. Socket auth verify cả hai (thử access trước, fallback refresh).
- **bcrypt**: mật khẩu hash với salt rounds = 10, không bao giờ trả password trong response (loại bỏ trước khi trả về). User đăng nhập Google có `password = null` → chặn login bằng mật khẩu với thông báo rõ ràng.
- **helmet**: set security headers sớm nhất trong chain (`contentSecurityPolicy: false` vì API trả JSON; `crossOriginResourcePolicy: cross-origin` để frontend + ảnh Cloudinary load được).
- **CORS**: whitelist `FRONTEND_URL`, `localhost:3000/3001`, và `*.vercel.app`; `credentials: true`.
- **Rate limiting**:
  - `loginLimiter` / `registerLimiter` / `forgotPasswordLimiter` cho các route auth (chống brute-force) — `/auth/google` cũng dùng `loginLimiter`.
  - AI: 20 request/giờ/user (key theo `userId`, fallback IP) cho `generate-caption` & `suggest-hashtags`.
- **Input validation**: kiểm tra field bắt buộc ở controller + ràng buộc nghiệp vụ ở service (vd độ dài mật khẩu, định dạng email, quyền tác giả). Lỗi → `AppError` với status code phù hợp.
- **Phân quyền**: middleware `authenticate` (bắt buộc login), `optionalAuthenticate` (login tùy chọn để biết `isLiked/isFollowing`), `requireAdmin` (chặn route admin).
- **Privacy**: `User.isPrivate`, `Post.privacy` (PUBLIC/FRIENDS/PRIVATE), `UserSettings.allowMessagesFrom` (EVERYONE/FOLLOWING/NONE) được enforce ở tầng service.

---

## 6. Các module chính trong `backend/src/modules/`

| Module          | Mô tả ngắn                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------- |
| `auth`          | Đăng ký, đăng nhập (email + Google OAuth), refresh token, logout, xác thực email, quên/đặt lại mật khẩu. |
| `users`         | Profile, follow/unfollow, followers/following, tìm kiếm, gợi ý, lời mời kết bạn. Kèm `settings.*` (đổi mật khẩu, privacy, notification). |
| `posts`         | CRUD bài viết, feed, like, save/pin, report, link-preview; `comment.*` (comment/reply + like comment); `repost.*` (repost/quote). |
| `hashtags`      | Lấy bài viết theo hashtag (cursor pagination).                                              |
| `messages`      | Conversation + Message: tạo/lấy hội thoại, gửi/đọc tin, badge unread. (mount tại `/conversations`) |
| `notifications` | Danh sách thông báo, đếm chưa đọc, đánh dấu đã đọc (từng cái / tất cả), xóa.                 |
| `stories`       | Story 24h: feed, tạo, đánh dấu đã xem, xóa. Có cron dọn story hết hạn.                       |
| `media`         | Upload ảnh/nhiều ảnh/video lên Cloudinary + xóa media.                                       |
| `ai`            | Sinh caption, gợi ý hashtag, kiểm duyệt nội dung qua Gemini (có rate limit).                 |
| `admin`         | Dashboard stats, quản lý user (ban/role/xóa), quản lý bài viết (xóa/khôi phục), xử lý report, quản lý hashtag. |

Hỗ trợ ngang: `socket/socketManager.js` (Socket.io), `config/` (cloudinary), `middlewares/` (auth, upload, rate limit), `utils/` (prisma, generateToken, email, AppError).

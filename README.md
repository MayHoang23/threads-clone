# Threads Clone

Clone mạng xã hội **Threads** với đầy đủ tính năng: đăng bài (text/ảnh/video), repost & quote, like, bình luận lồng nhau, nhắn tin realtime và kiểm duyệt nội dung bằng AI. Hỗ trợ thông báo thời gian thực, Stories 24h, dark mode, PWA và đa ngôn ngữ.

> 📚 Đây là **đồ án tốt nghiệp**, được tiếp tục phát triển và hoàn thiện thêm sau khi bảo vệ.

---

## 🛠️ Công nghệ sử dụng

| Lớp | Công nghệ |
|------|-----------|
| **Frontend** | Next.js 14 (App Router), TailwindCSS |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL + Prisma ORM |
| **Realtime** | Socket.io |
| **Lưu trữ media** | Cloudinary |
| **AI** | Google Gemini API (`gemini-2.5-flash`) |
| **Auth** | JWT (access token 15 phút + refresh token 7 ngày) |
| **Email** | Nodemailer (Gmail) |

---

## ✨ Tính năng chính

### 🔐 Auth & User
- Đăng ký / đăng nhập, refresh token, đăng xuất
- Xác thực email, quên mật khẩu / đặt lại mật khẩu
- Trang cá nhân (profile): cover, avatar, bio, website, badge verified, bài ghim
- Cài đặt (settings): đổi mật khẩu, quyền riêng tư, thông báo
- **Tài khoản riêng tư** (private account) — chỉ người theo dõi mới xem được bài

### 📝 Bài viết
- Đăng bài text / ảnh / video, link preview (Open Graph)
- Like, bình luận + **reply lồng nhau (nested)**, like bình luận
- Lưu bài (save), **repost** & **quote post**
- Hashtag, mention (@username)

### ⚡ Realtime
- Thông báo thời gian thực (like, comment, follow, mention, repost…)
- Nhắn tin (text / ảnh / video / **voice**), typing indicator, read receipt
- Cài đặt "ai có thể nhắn tin cho bạn" (everyone / following / none)

### 🤖 AI
- Caption Generator — gợi ý nội dung bài viết
- Hashtag Suggester — gợi ý hashtag
- Content Moderation — kiểm duyệt nội dung vi phạm

### 🎨 Khác
- Stories 24h
- Dark mode (class-based, chống FOUC)
- PWA (manifest + service worker)
- Đa ngôn ngữ: Tiếng Việt / English / 中文 (vi / en / zh)
- Admin Panel (repo riêng)

---

## 📁 Cấu trúc thư mục

```
threads-clone/
├── frontend/                 # Next.js 14
│   ├── app/
│   │   ├── (main)/           # newsfeed, profile, search, friends,
│   │   │                     # notifications, settings, messages
│   │   └── layout.js
│   ├── components/           # post, user, messages, ai, stories, layout, ui
│   ├── contexts/             # Auth, Theme, Socket, Language
│   └── lib/                  # api.js, auth.js, socket.js, translations/
│
└── backend/                  # Express
    └── src/
        ├── modules/          # auth, posts, users, notifications, media,
        │                     # ai, messages, stories, admin
        ├── socket/           # socketManager.js (JWT auth, room/user)
        ├── config/           # cloudinary.js, anthropic.js
        ├── middlewares/      # authenticate.js, upload.js
        └── utils/            # AppError.js, prisma, email, generateToken
    └── prisma/schema.prisma  # 14+ models
```

---

## 🚀 Cài đặt và chạy

Yêu cầu: **Node.js 18+**, **PostgreSQL 14+**.

```bash
# Clone repo
git clone <repo-url>
cd threads-clone

# ===== Backend =====
cd backend
cp .env.example .env
# Điền các biến môi trường vào .env (DATABASE_URL, JWT, Cloudinary, Gemini, Gmail...)
npm install
npx prisma migrate dev      # tạo bảng trong database
npm run dev                 # chạy backend tại http://localhost:5000

# ===== Frontend (mở terminal mới) =====
cd frontend
cp .env.example .env.local
# Điền NEXT_PUBLIC_API_URL và NEXT_PUBLIC_SOCKET_URL
npm install
npm run dev                 # chạy frontend tại http://localhost:3000
```

> 💡 Trên Windows, sau khi chạy `prisma migrate` đôi khi cần **restart backend** (lỗi EPERM khóa file DLL của Prisma).

---

## 👤 Tài khoản demo

Hiện dự án **chưa có sẵn dữ liệu demo (seed)** trong database.

Để trải nghiệm nhanh, chọn một trong hai cách:

1. **Tự đăng ký tài khoản mới** trên trang `/register`, hoặc
2. Đặt `SKIP_EMAIL_VERIFY=true` trong `backend/.env` để **bỏ qua bước xác thực email** khi đăng ký/đăng nhập (tiện demo khi chưa cấu hình SMTP).

| Tài khoản | Mật khẩu | Ghi chú |
|-----------|----------|---------|
| _(tự đăng ký)_ | _(tự đặt)_ | Bật `SKIP_EMAIL_VERIFY=true` để đăng nhập ngay |

---

## 🛡️ Admin Panel

Trang quản trị nằm ở **repo riêng**: `threads-clone-admin`.

- Chạy ở cổng **3001**
- Dùng chung backend (`/api/v1/admin`) của dự án này
- Cách chạy tương tự frontend:

```bash
cd threads-clone-admin
cp .env.example .env.local   # cấu hình NEXT_PUBLIC_API_URL trỏ về backend
npm install
npm run dev                  # chạy admin tại http://localhost:3001
```

---

## 👨‍💻 Tác giả

**Machine Hoàng** — GitHub: [@MayHoang23](https://github.com/MayHoang23)

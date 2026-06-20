# API Reference — Threads Clone

- **Base URL**: `http://localhost:5000/api/v1`
- **Response format chung**: `{ success: boolean, data: object | null, message: string }`
- **Auth**: gửi header `Authorization: Bearer <accessToken>` với các endpoint **Auth: ✅**.
  - `authenticate` → bắt buộc đăng nhập.
  - `optionalAuth` → không bắt buộc, nhưng nếu có token sẽ trả thêm cờ (`isLiked`, `isSaved`, `isFollowing`...).
  - `admin` → bắt buộc đăng nhập **và** role ADMIN.

> Liệt kê dựa trên quét trực tiếp các file `*.routes.js` trong `backend/src/modules/`.

---

## System / Health (`/`)

| Method | Path             | Auth | Mô tả                         |
| ------ | ---------------- | ---- | ----------------------------- |
| GET    | `/`              | ❌   | Ping root (ngoài prefix v1)   |
| GET    | `/api/v1/health` | ❌   | Health check + timestamp      |

---

## Auth — `/api/v1/auth`

| Method | Path              | Auth | Body chính                              | Mô tả                                          |
| ------ | ----------------- | ---- | --------------------------------------- | ---------------------------------------------- |
| POST   | `/register`       | ❌   | `username, email, password, displayName` | Đăng ký (rate-limited)                         |
| POST   | `/login`          | ❌   | `email, password`                       | Đăng nhập, trả access + refresh token          |
| POST   | `/google`         | ❌   | `access_token`                          | Đăng nhập Google (verify qua userinfo)         |
| POST   | `/refresh-token`  | ❌   | `refreshToken`                          | Cấp access token mới                           |
| POST   | `/logout`         | ❌   | —                                       | Đăng xuất (client tự xóa token)                |
| GET    | `/verify-email`   | ❌   | query `token`                           | Xác thực email sau đăng ký                     |
| POST   | `/forgot-password`| ❌   | `email`                                 | Gửi email đặt lại mật khẩu (rate-limited)      |
| POST   | `/reset-password` | ❌   | `token, password`                       | Đặt lại mật khẩu bằng token                    |

**Tổng: 8 endpoint**

---

## Users — `/api/v1/users`

| Method | Path                          | Auth         | Body chính        | Mô tả                                   |
| ------ | ----------------------------- | ------------ | ----------------- | --------------------------------------- |
| GET    | `/search`                     | optionalAuth | query `q`         | Tìm user/bài viết/hashtag               |
| GET    | `/suggestions`                | ✅           | —                 | Gợi ý người để follow                   |
| GET    | `/friend-requests`            | ✅           | —                 | Danh sách lời mời kết bạn đến           |
| POST   | `/friend-request/:username`   | ✅           | —                 | Gửi lời mời kết bạn                      |
| PUT    | `/friend-request/:requestId`  | ✅           | `action` (accept/reject) | Chấp nhận / từ chối lời mời       |
| PUT    | `/profile`                    | ✅           | profile fields    | Cập nhật profile (PUT)                  |
| PATCH  | `/profile`                    | ✅           | profile fields    | Cập nhật profile (PATCH, cùng handler)  |
| GET    | `/:username`                  | optionalAuth | —                 | Xem profile (kèm `isFollowing` nếu login) |
| GET    | `/:username/posts`            | optionalAuth | —                 | Bài viết của user                       |
| GET    | `/:username/replies`          | optionalAuth | —                 | Các trả lời (comment) của user          |
| POST   | `/:username/follow`           | ✅           | —                 | Follow / unfollow (toggle)              |
| GET    | `/:username/followers`        | optionalAuth | —                 | Danh sách followers                     |
| GET    | `/:username/following`        | optionalAuth | —                 | Danh sách following                     |

**Tổng: 13 endpoint**

---

## Settings — `/api/v1/settings`

> Toàn bộ yêu cầu đăng nhập (`router.use(authenticate)`).

| Method | Path             | Auth | Body chính                                       | Mô tả                       |
| ------ | ---------------- | ---- | ------------------------------------------------ | --------------------------- |
| GET    | `/`              | ✅   | —                                                | Lấy settings hiện tại       |
| PATCH  | `/password`      | ✅   | `currentPassword, newPassword, confirmPassword`  | Đổi mật khẩu                |
| PATCH  | `/privacy`       | ✅   | `isPrivate, allowMessagesFrom`                   | Cập nhật quyền riêng tư     |
| PATCH  | `/notifications` | ✅   | `likeNotif, commentNotif, followNotif, emailNotif` | Cập nhật cài đặt thông báo |

**Tổng: 4 endpoint**

---

## Posts — `/api/v1/posts` (+ comments tại `/api/v1/comments`)

| Method | Path                  | Auth         | Body chính                                              | Mô tả                              |
| ------ | --------------------- | ------------ | ------------------------------------------------------- | ---------------------------------- |
| POST   | `/`                   | ✅           | `content, privacy, mediaUrls[], linkUrl, linkTitle, linkDescription, linkImage, linkSiteName` | Tạo bài viết |
| GET    | `/feed`               | ✅           | query cursor                                            | Newsfeed (cursor pagination)       |
| GET    | `/trending-hashtags`  | ❌           | —                                                       | Top hashtag hot                    |
| GET    | `/saved`              | ✅           | —                                                       | Bài đã lưu của user                |
| GET    | `/link-preview`       | ✅           | query `url`                                             | Fetch Open Graph từ URL            |
| GET    | `/:id`                | optionalAuth | —                                                       | Chi tiết bài (kèm isLiked/isSaved) |
| PUT    | `/:id`                | ✅           | `content, privacy`                                      | Sửa bài (chỉ tác giả)              |
| DELETE | `/:id`                | ✅           | —                                                       | Xóa bài (chỉ tác giả)              |
| POST   | `/:id/like`           | ✅           | —                                                       | Like / unlike (toggle)             |
| POST   | `/:id/comments`       | ✅           | `content, mediaUrl, parentId`                           | Thêm comment / reply               |
| GET    | `/:id/comments`       | optionalAuth | —                                                       | Lấy danh sách comment              |
| POST   | `/:id/save`           | ✅           | —                                                       | Lưu / bỏ lưu (toggle)              |
| POST   | `/:id/pin`            | ✅           | —                                                       | Ghim bài (chỉ tác giả)             |
| DELETE | `/:id/pin`            | ✅           | —                                                       | Bỏ ghim bài                        |
| POST   | `/:id/report`         | ✅           | `reason`                                                | Báo cáo bài viết                   |
| POST   | `/:id/repost`         | ✅           | —                                                       | Repost bài viết                    |
| DELETE | `/:id/repost`         | ✅           | —                                                       | Bỏ repost                          |
| POST   | `/:id/quote`          | ✅           | `content, privacy, mediaUrls[]`                         | Quote post (trích dẫn)             |
| GET    | `/:id/reposts`        | optionalAuth | —                                                       | Danh sách người đã repost          |

### Comments — `/api/v1/comments`

| Method | Path         | Auth | Body chính | Mô tả                          |
| ------ | ------------ | ---- | ---------- | ------------------------------ |
| POST   | `/:id/like`  | ✅   | —          | Thích / bỏ thích bình luận     |
| DELETE | `/:id`       | ✅   | —          | Xóa bình luận (tác giả/admin)  |

**Tổng: 19 (posts) + 2 (comments) = 21 endpoint**

---

## Hashtags — `/api/v1/hashtags`

| Method | Path             | Auth         | Body chính   | Mô tả                                  |
| ------ | ---------------- | ------------ | ------------ | -------------------------------------- |
| GET    | `/:name/posts`   | optionalAuth | query cursor | Bài viết theo hashtag (cursor paginate)|

**Tổng: 1 endpoint**

---

## Messages — `/api/v1/conversations`

> Toàn bộ yêu cầu đăng nhập (`router.use(authenticate)`).

| Method | Path               | Auth | Body chính                  | Mô tả                                  |
| ------ | ------------------ | ---- | --------------------------- | -------------------------------------- |
| GET    | `/`                | ✅   | —                           | Danh sách hội thoại                    |
| POST   | `/`                | ✅   | `userId` (người nhận)       | Lấy hoặc tạo hội thoại 1-1             |
| GET    | `/unread-count`    | ✅   | —                           | Số DM chưa đọc (badge)                 |
| GET    | `/:id/messages`    | ✅   | query cursor                | Tin nhắn trong hội thoại               |
| POST   | `/:id/messages`    | ✅   | `content, mediaUrl, mediaType` | Gửi tin nhắn (emit realtime)        |
| PATCH  | `/:id/read`        | ✅   | —                           | Đánh dấu đã đọc                        |

**Tổng: 6 endpoint**

---

## Notifications — `/api/v1/notifications`

> Toàn bộ yêu cầu đăng nhập (`router.use(authenticate)`).

| Method | Path             | Auth | Body chính | Mô tả                          |
| ------ | ---------------- | ---- | ---------- | ------------------------------ |
| GET    | `/unread-count`  | ✅   | —          | Số thông báo chưa đọc          |
| PATCH  | `/read-all`      | ✅   | —          | Đánh dấu tất cả đã đọc         |
| GET    | `/`              | ✅   | query cursor | Danh sách thông báo          |
| PATCH  | `/:id/read`      | ✅   | —          | Đánh dấu 1 thông báo đã đọc    |
| DELETE | `/:id`           | ✅   | —          | Xóa 1 thông báo                |

**Tổng: 5 endpoint**

---

## Stories — `/api/v1/stories`

| Method | Path          | Auth | Body chính                          | Mô tả                                |
| ------ | ------------- | ---- | ----------------------------------- | ------------------------------------ |
| GET    | `/feed`       | ✅   | —                                   | Story của người đang follow + của mình |
| POST   | `/`           | ✅   | `mediaUrl, mediaType, caption, bgColor` | Đăng story mới                   |
| POST   | `/:id/view`   | ✅   | —                                   | Đánh dấu đã xem                      |
| DELETE | `/:id`        | ✅   | —                                   | Xóa story (chỉ owner)               |

**Tổng: 4 endpoint**

---

## Media — `/api/v1/media`

> Toàn bộ yêu cầu đăng nhập. Upload dùng `multipart/form-data`.

| Method | Path               | Auth | Body chính                  | Mô tả                                   |
| ------ | ------------------ | ---- | --------------------------- | --------------------------------------- |
| POST   | `/upload-image`    | ✅   | file (field ảnh)            | Upload 1 ảnh lên Cloudinary             |
| POST   | `/upload-multiple` | ✅   | files (nhiều ảnh)           | Upload nhiều ảnh                        |
| POST   | `/upload-video`    | ✅   | file (video)                | Upload video                            |
| DELETE | `/*path`           | ✅   | path = publicId (có thể chứa `/`) | Xóa media trên Cloudinary theo publicId |

**Tổng: 4 endpoint**

---

## AI — `/api/v1/ai`

| Method | Path                 | Auth | Body chính        | Mô tả                                            |
| ------ | -------------------- | ---- | ----------------- | ------------------------------------------------ |
| POST   | `/generate-caption`  | ✅   | `idea, tone`      | Sinh caption (rate limit 20/giờ/user)            |
| POST   | `/suggest-hashtags`  | ✅   | `content`         | Gợi ý hashtag (rate limit 20/giờ/user)           |
| POST   | `/moderate-content`  | ❌   | `content`         | Kiểm duyệt nội dung (internal, gọi từ post.service) |

**Tổng: 3 endpoint**

---

## Admin — `/api/v1/admin`

> Toàn bộ yêu cầu `authenticate` + `requireAdmin` (role ADMIN).

| Method | Path                          | Auth  | Body chính | Mô tả                          |
| ------ | ----------------------------- | ----- | ---------- | ------------------------------ |
| GET    | `/stats`                      | admin | —          | Thống kê dashboard             |
| GET    | `/users`                      | admin | query      | Danh sách user                 |
| PATCH  | `/users/:userId/ban`          | admin | —          | Ban / unban user (toggle)      |
| PATCH  | `/users/:userId/role`         | admin | `role`     | Đổi role user                  |
| DELETE | `/users/:userId`              | admin | —          | Xóa user                       |
| GET    | `/posts`                      | admin | query      | Danh sách bài viết             |
| DELETE | `/posts/:postId`              | admin | —          | Xóa (ẩn) bài viết              |
| PATCH  | `/posts/:postId/restore`      | admin | —          | Khôi phục bài viết             |
| GET    | `/reports`                    | admin | query      | Danh sách report               |
| PATCH  | `/reports/:reportId/resolve`  | admin | `action`   | Xử lý report                   |
| GET    | `/hashtags`                   | admin | query      | Danh sách hashtag              |
| GET    | `/hashtags/top`               | admin | —          | Top hashtag                    |
| DELETE | `/hashtags/:hashtagId`        | admin | —          | Xóa hashtag                    |

**Tổng: 13 endpoint**

---

## Tổng kết số lượng endpoint

| Module          | Số endpoint |
| --------------- | ----------- |
| System/Health   | 2           |
| Auth            | 8           |
| Users           | 13          |
| Settings        | 4           |
| Posts (+Comments)| 21         |
| Hashtags        | 1           |
| Messages        | 6           |
| Notifications   | 5           |
| Stories         | 4           |
| Media           | 4           |
| AI              | 3           |
| Admin           | 13          |
| **TỔNG**        | **84**      |

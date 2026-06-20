# ERD — Threads Clone (Prisma schema)

Sơ đồ quan hệ thực thể dựa trên `backend/prisma/schema.prisma`. Chỉ liệt kê các field quan trọng (id, khóa ngoại, field định danh / trạng thái).

```mermaid
erDiagram
    User ||--|| UserSettings : "1-1"
    User ||--o{ Post : "author"
    User ||--o{ Like : "likes"
    User ||--o{ Comment : "comments"
    User ||--o{ CommentLike : "likes comment"
    User ||--o{ SavedPost : "saves"
    User ||--o{ Message : "sender"
    User ||--o{ ConversationMember : "member of"
    User ||--o{ Notification : "receiver"
    User ||--o{ Notification : "triggered by"
    User ||--o{ Report : "reporter"
    User ||--o{ Story : "owner"
    User ||--o{ StoryView : "viewer"
    User ||--o{ Follow : "follower"
    User ||--o{ Follow : "following"
    User ||--o{ Friendship : "requester"
    User ||--o{ Friendship : "receiver"

    Post ||--o{ Media : "has"
    Post ||--o{ Like : "liked by"
    Post ||--o{ Comment : "has"
    Post ||--o{ SavedPost : "saved by"
    Post ||--o{ PostHashtag : "tagged"
    Post ||--o{ Report : "reported"
    Post ||--o{ Notification : "about"
    Post ||--o{ Post : "repostOf"
    Post ||--o{ Post : "quotedPost"

    Comment ||--o{ Comment : "parent / replies"
    Comment ||--o{ CommentLike : "liked by"

    Hashtag ||--o{ PostHashtag : "in"

    Conversation ||--o{ ConversationMember : "has"
    Conversation ||--o{ Message : "has"

    Story ||--o{ StoryView : "viewed by"

    User {
        string id PK
        string username UK
        string email UK
        string password "nullable (Google = null)"
        Role role
        boolean isPrivate
        boolean isBanned
        boolean emailVerified
        string pinnedPostId
    }
    UserSettings {
        string id PK
        string userId FK_UK
        MessagesFrom allowMessagesFrom
        boolean likeNotif
        boolean commentNotif
        boolean followNotif
    }
    Post {
        string id PK
        string authorId FK
        Privacy privacy
        boolean isHidden
        string repostOfId FK "self"
        string quotedPostId FK "self"
    }
    Media {
        string id PK
        string postId FK
        MediaType type
        string url
    }
    Like {
        string id PK
        string userId FK
        string postId FK
    }
    Comment {
        string id PK
        string userId FK
        string postId FK
        string parentId FK "self - reply"
    }
    CommentLike {
        string id PK
        string userId FK
        string commentId FK
    }
    Follow {
        string id PK
        string followerId FK
        string followingId FK
    }
    Friendship {
        string id PK
        string requesterId FK
        string receiverId FK
        FriendshipStatus status
    }
    SavedPost {
        string id PK
        string userId FK
        string postId FK
    }
    Hashtag {
        string id PK
        string name UK
    }
    PostHashtag {
        string postId FK
        string hashtagId FK
    }
    Conversation {
        string id PK
        datetime lastMessageAt
    }
    ConversationMember {
        string id PK
        string conversationId FK
        string userId FK
    }
    Message {
        string id PK
        string senderId FK
        string conversationId FK
        boolean isRead
        string content
    }
    Notification {
        string id PK
        NotificationType type
        string receiverId FK
        string triggeredId FK "nullable"
        string postId FK "nullable"
        boolean isRead
    }
    Report {
        string id PK
        string userId FK
        string postId FK "nullable"
        ReportStatus status
        string reason
    }
    Story {
        string id PK
        string userId FK
        datetime expiresAt
        string mediaType
    }
    StoryView {
        string id PK
        string storyId FK
        string userId FK
    }
```

---

## Giải thích các quan hệ

### Quan hệ 1-1

- **User ↔ UserSettings**: mỗi user có đúng một bản cài đặt (`UserSettings.userId` là `@unique`). Xóa user → cascade xóa settings.

### Quan hệ 1-n đơn giản

- **User → Post / Comment / Story / Message / Report**: một user tạo nhiều bản ghi; FK `authorId` / `userId` / `senderId` trỏ về `User`.
- **Post → Media**: một bài có nhiều ảnh/video.
- **Conversation → Message**: một hội thoại chứa nhiều tin nhắn.
- **Story → StoryView**: một story có nhiều lượt xem.

### Quan hệ n-n (qua bảng nối)

- **Post ↔ Hashtag** qua **PostHashtag**: một bài có nhiều hashtag, một hashtag thuộc nhiều bài. Khóa chính kép `@@id([postId, hashtagId])`.
- **User ↔ Conversation** qua **ConversationMember**: một hội thoại có nhiều thành viên, một user tham gia nhiều hội thoại. Unique `@@unique([conversationId, userId])`.
- **User ↔ Post** qua **Like** và **SavedPost**: cờ unique `@@unique([userId, postId])` đảm bảo mỗi user chỉ like / lưu một bài đúng một lần.
- **User ↔ Comment** qua **CommentLike**: unique `@@unique([userId, commentId])`.

### Quan hệ tự tham chiếu (self-relation) — phức tạp

- **Post → Post (repostOf / quotedPost)**: bảng `Post` tự quan hệ với chính nó qua **hai** đường:
  - `repostOfId` → relation `"Reposts"`: bài này là repost của bài gốc nào.
  - `quotedPostId` → relation `"Quotes"`: bài này trích dẫn (quote) bài gốc nào.
  - Cả hai dùng `onDelete: SetNull` — xóa bài gốc **không** xóa lan bài repost/quote, chỉ gỡ liên kết.
- **Comment → Comment (parentId)**: comment tự quan hệ để hỗ trợ **reply lồng nhau**. `parentId = null` là comment gốc; có giá trị là reply của comment cha. `onDelete: Cascade` — xóa comment cha sẽ xóa toàn bộ reply con.

### Quan hệ "hai vai" trên cùng một bảng

Một số bảng nối tới `User` qua **hai** FK khác vai trò, nên `User` xuất hiện hai lần trong sơ đồ với hai relation:

- **Follow**: `followerId` (người theo dõi) và `followingId` (người được theo dõi). Unique `@@unique([followerId, followingId])` — quan hệ một chiều, không có trạng thái PENDING.
- **Friendship**: `requesterId` (người gửi) và `receiverId` (người nhận), kèm `status` (PENDING/ACCEPTED/REJECTED).
- **Notification**: `receiverId` (người nhận thông báo) và `triggeredId` (người gây ra hành động — **nullable**, vd thông báo hệ thống POST_HIDDEN không có người kích hoạt). Có thêm `postId` nullable trỏ tới bài liên quan.

### FK nullable đáng chú ý

- `Notification.triggeredId`, `Notification.postId`, `Report.postId` đều nullable — cho phép thông báo/report không gắn user kích hoạt hoặc không gắn bài cụ thể.
- `Post.repostOfId`, `Post.quotedPostId` nullable — đa số bài là bài thường, không repost/quote.
- `User.password` nullable — tài khoản đăng nhập bằng Google không có mật khẩu.

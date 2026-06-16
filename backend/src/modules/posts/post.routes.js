const express = require("express");
const router = express.Router();
const postController = require("./post.controller");
const commentController = require("./comment.controller");
const repostController = require("./repost.controller");
const { authenticate, optionalAuthenticate } = require("../../middlewares/auth.middleware");

// POST /api/v1/posts — tạo bài viết (bắt buộc đăng nhập)
router.post("/", authenticate, postController.createPost);

// GET /api/v1/posts/feed — newsfeed (bắt buộc đăng nhập)
// QUAN TRỌNG: route /feed phải đặt TRƯỚC /:id
// Nếu đặt sau, Express sẽ nhận "feed" là giá trị của param :id
router.get("/feed", authenticate, postController.getFeed);

// GET /api/v1/posts/trending-hashtags — top hashtag hot
// QUAN TRỌNG: phải đặt TRƯỚC /:id để không bị nhận nhầm là param :id
router.get("/trending-hashtags", postController.getTrendingHashtags);

// GET /api/v1/posts/saved — bài đã lưu của user
// QUAN TRỌNG: phải đặt TRƯỚC /:id để không bị nhận nhầm là param :id
router.get("/saved", authenticate, postController.getSavedPosts);

// GET /api/v1/posts/:id — xem chi tiết (không bắt buộc login, nhưng nếu có thì biết isLiked/isSaved)
router.get("/:id", optionalAuthenticate, postController.getPostById);

// PUT /api/v1/posts/:id — sửa bài viết (bắt buộc đăng nhập, phải là tác giả)
router.put("/:id", authenticate, postController.updatePost);

// DELETE /api/v1/posts/:id — xóa bài viết (bắt buộc đăng nhập, phải là tác giả)
router.delete("/:id", authenticate, postController.deletePost);

// POST /api/v1/posts/:id/like — like / unlike
router.post("/:id/like", authenticate, postController.toggleLike);

// POST /api/v1/posts/:id/comments — thêm comment (hoặc reply nếu có parentId)
router.post("/:id/comments", authenticate, commentController.createComment);

// GET /api/v1/posts/:id/comments — lấy danh sách comment (optionalAuth để biết isLikedByMe)
router.get("/:id/comments", optionalAuthenticate, commentController.getComments);

// POST /api/v1/posts/:id/save — lưu / bỏ lưu bài
router.post("/:id/save", authenticate, postController.toggleSave);

// POST /api/v1/posts/:id/report — báo cáo bài viết
router.post("/:id/report", authenticate, postController.createReport);

// ===== REPOST & QUOTE =====
// POST /api/v1/posts/:id/repost — repost bài viết
router.post("/:id/repost", authenticate, repostController.repostPost);

// DELETE /api/v1/posts/:id/repost — bỏ repost
router.delete("/:id/repost", authenticate, repostController.unrepostPost);

// POST /api/v1/posts/:id/quote — quote post (trích dẫn)
router.post("/:id/quote", authenticate, repostController.quotePost);

// GET /api/v1/posts/:id/reposts — danh sách người đã repost
router.get("/:id/reposts", optionalAuthenticate, repostController.getReposts);

module.exports = router;

const express = require("express");
const router = express.Router();
const postController = require("./post.controller");
const { authenticate, optionalAuthenticate } = require("../../middlewares/auth.middleware");

// POST /api/v1/posts — tạo bài viết (bắt buộc đăng nhập)
router.post("/", authenticate, postController.createPost);

// GET /api/v1/posts/feed — newsfeed (bắt buộc đăng nhập)
// QUAN TRỌNG: route /feed phải đặt TRƯỚC /:id
// Nếu đặt sau, Express sẽ nhận "feed" là giá trị của param :id
router.get("/feed", authenticate, postController.getFeed);

// GET /api/v1/posts/:id — xem chi tiết (không bắt buộc login, nhưng nếu có thì biết isLiked/isSaved)
router.get("/:id", optionalAuthenticate, postController.getPostById);

// PUT /api/v1/posts/:id — sửa bài viết (bắt buộc đăng nhập, phải là tác giả)
router.put("/:id", authenticate, postController.updatePost);

// DELETE /api/v1/posts/:id — xóa bài viết (bắt buộc đăng nhập, phải là tác giả)
router.delete("/:id", authenticate, postController.deletePost);

// POST /api/v1/posts/:id/like — like / unlike
router.post("/:id/like", authenticate, postController.toggleLike);

// POST /api/v1/posts/:id/comments — thêm comment
router.post("/:id/comments", authenticate, postController.createComment);

// GET /api/v1/posts/:id/comments — lấy danh sách comment
router.get("/:id/comments", postController.getComments);

// POST /api/v1/posts/:id/save — lưu / bỏ lưu bài
router.post("/:id/save", authenticate, postController.toggleSave);

module.exports = router;

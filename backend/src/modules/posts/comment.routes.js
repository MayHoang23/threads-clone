const express = require("express");
const router = express.Router();
const commentController = require("./comment.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

// Mount tại /api/v1/comments (xem index.js)

// POST /api/v1/comments/:id/like — thích / bỏ thích bình luận
router.post("/:id/like", authenticate, commentController.likeComment);

// DELETE /api/v1/comments/:id — xóa bình luận (tác giả hoặc admin)
router.delete("/:id", authenticate, commentController.deleteComment);

module.exports = router;

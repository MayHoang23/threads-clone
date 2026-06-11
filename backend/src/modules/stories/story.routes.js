const express = require("express");
const router = express.Router();
const storyController = require("./story.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

// GET /api/v1/stories/feed — stories của người đang follow + của mình
// QUAN TRỌNG: /feed phải đặt TRƯỚC /:id để không bị nhận nhầm là param
router.get("/feed", authenticate, storyController.getStoriesFeed);

// POST /api/v1/stories — đăng story mới
router.post("/", authenticate, storyController.createStory);

// POST /api/v1/stories/:id/view — đánh dấu đã xem
router.post("/:id/view", authenticate, storyController.viewStory);

// DELETE /api/v1/stories/:id — xóa story (chỉ owner)
router.delete("/:id", authenticate, storyController.deleteStory);

module.exports = router;

const storyService = require("./story.service");

// GET /api/v1/stories/feed
const getStoriesFeed = async (req, res, next) => {
  try {
    const data = await storyService.getStoriesFeed(req.user.id);
    res.json({ success: true, data, message: "Lấy stories thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/stories
const createStory = async (req, res, next) => {
  try {
    const { mediaUrl, mediaType, caption, bgColor } = req.body;
    if (mediaType === "text" && !caption?.trim()) {
      return res.status(400).json({ success: false, data: null, message: "Story văn bản cần có nội dung" });
    }
    if (mediaType !== "text" && !mediaUrl) {
      return res.status(400).json({ success: false, data: null, message: "Thiếu mediaUrl" });
    }
    const data = await storyService.createStory(req.user.id, { mediaUrl, mediaType, caption, bgColor });
    res.status(201).json({ success: true, data, message: "Đăng story thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/stories/:id/view
const viewStory = async (req, res, next) => {
  try {
    const data = await storyService.viewStory(req.user.id, req.params.id);
    res.json({ success: true, data, message: "Đã xem story" });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/stories/:id
const deleteStory = async (req, res, next) => {
  try {
    const data = await storyService.deleteStory(req.user.id, req.params.id);
    res.json({ success: true, data, message: "Đã xóa story" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStoriesFeed, createStory, viewStory, deleteStory };

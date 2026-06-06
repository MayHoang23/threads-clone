const postService = require("./post.service");

// POST /api/v1/posts
const createPost = async (req, res, next) => {
  try {
    const { content, privacy, mediaUrls } = req.body;
    const post = await postService.createPost(req.user.id, {
      content,
      privacy,
      mediaUrls: mediaUrls || [],
    });
    res.status(201).json({ success: true, data: post, message: "Tạo bài viết thành công" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/posts/feed
const getFeed = async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await postService.getFeed(
      req.user.id,
      cursor || null,
      Math.min(Number(limit) || 10, 50) // Giới hạn tối đa 50 bài / request
    );
    res.json({ success: true, data: result, message: "" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/posts/:id
const getPostById = async (req, res, next) => {
  try {
    // req.user có thể undefined nếu chưa đăng nhập (optionalAuthenticate)
    const post = await postService.getPostById(req.params.id, req.user?.id || null);
    res.json({ success: true, data: post, message: "" });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/posts/:id
const updatePost = async (req, res, next) => {
  try {
    const { content, privacy } = req.body;
    const post = await postService.updatePost(req.params.id, req.user.id, { content, privacy });
    res.json({ success: true, data: post, message: "Cập nhật bài viết thành công" });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/posts/:id
const deletePost = async (req, res, next) => {
  try {
    await postService.deletePost(req.params.id, req.user.id);
    res.json({ success: true, data: null, message: "Xóa bài viết thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/posts/:id/like
const toggleLike = async (req, res, next) => {
  try {
    const result = await postService.toggleLike(req.user.id, req.params.id);
    res.json({
      success: true,
      data: result,
      message: result.liked ? "Đã like bài viết" : "Đã bỏ like",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/posts/:id/comments
const createComment = async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    const comment = await postService.createComment(
      req.user.id,
      req.params.id,
      content,
      parentId || null
    );
    res.status(201).json({ success: true, data: comment, message: "Đã thêm bình luận" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/posts/:id/comments
const getComments = async (req, res, next) => {
  try {
    const comments = await postService.getComments(req.params.id);
    res.json({ success: true, data: comments, message: "" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/posts/:id/save
const toggleSave = async (req, res, next) => {
  try {
    const result = await postService.toggleSave(req.user.id, req.params.id);
    res.json({
      success: true,
      data: result,
      message: result.saved ? "Đã lưu bài viết" : "Đã bỏ lưu",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPost,
  getFeed,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  createComment,
  getComments,
  toggleSave,
};

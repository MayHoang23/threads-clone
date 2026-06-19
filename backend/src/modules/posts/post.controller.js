const postService = require("./post.service");
const linkPreviewService = require("./linkPreview.service");
const prisma = require("../../utils/prisma");

// POST /api/v1/posts
const createPost = async (req, res, next) => {
  try {
    const {
      content,
      privacy,
      mediaUrls,
      linkUrl,
      linkTitle,
      linkDescription,
      linkImage,
      linkSiteName,
    } = req.body;
    const post = await postService.createPost(req.user.id, {
      content,
      privacy,
      mediaUrls: mediaUrls || [],
      linkUrl,
      linkTitle,
      linkDescription,
      linkImage,
      linkSiteName,
    });
    res.status(201).json({ success: true, data: post, message: "Tạo bài viết thành công" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/posts/link-preview?url=https://...
const getLinkPreview = async (req, res) => {
  // Không dùng next(err): theo spec, mọi thất bại đều trả { success: false }
  try {
    const { url } = req.query;
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.json({ success: false, data: null, message: "URL không hợp lệ" });
    }
    const preview = await linkPreviewService.getLinkPreview(url);
    if (!preview) {
      return res.json({ success: false, data: null, message: "Không lấy được thông tin link" });
    }
    return res.json({ success: true, data: preview, message: "" });
  } catch (err) {
    return res.json({ success: false, data: null, message: "Không lấy được thông tin link" });
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

// GET /api/v1/posts/trending-hashtags
const getTrendingHashtags = async (req, res, next) => {
  try {
    const hashtags = await postService.getTrendingHashtags();
    res.json({ success: true, data: hashtags, message: "" });
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

// GET /api/v1/posts/saved
const getSavedPosts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cursor, limit } = req.query;
    const result = await postService.getSavedPosts(userId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    return res.json({ success: true, data: result, message: "Lấy bài đã lưu thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/posts/:id/pin — ghim bài (chỉ tác giả)
const pinPost = async (req, res, next) => {
  try {
    const result = await postService.pinPost(req.user.id, req.params.id);
    res.json({ success: true, data: result, message: "Đã ghim bài viết" });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/posts/:id/pin — bỏ ghim (chỉ tác giả)
const unpinPost = async (req, res, next) => {
  try {
    const result = await postService.unpinPost(req.user.id, req.params.id);
    res.json({ success: true, data: result, message: "Đã bỏ ghim bài viết" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/posts/:id/report
const createReport = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const report = await prisma.report.create({
      data: {
        postId: req.params.id,
        userId: req.user.id,
        reason: reason || "Vi phạm tiêu chuẩn cộng đồng",
      },
    });
    return res.status(201).json({ success: true, data: report, message: "Đã gửi báo cáo" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPost,
  getLinkPreview,
  getFeed,
  getTrendingHashtags,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  toggleSave,
  getSavedPosts,
  pinPost,
  unpinPost,
  createReport,
};

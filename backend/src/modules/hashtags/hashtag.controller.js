const hashtagService = require("./hashtag.service");

// GET /api/v1/hashtags/:name/posts
const getPostsByHashtag = async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await hashtagService.getPostsByHashtag(
      req.params.name,
      req.user?.id || null, // optionalAuthenticate → có thể chưa đăng nhập
      cursor || null,
      Math.min(Number(limit) || 10, 50) // Giới hạn tối đa 50 bài / request
    );
    res.json({ success: true, data: result, message: "" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPostsByHashtag };

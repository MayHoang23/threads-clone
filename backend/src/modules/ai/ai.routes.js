const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { authenticate } = require("../../middlewares/auth.middleware");
const { generateCaption, suggestHashtags, moderateContent } = require("./ai.controller");

const router = express.Router();

// Rate limit 20 req/hour/user cho các endpoint tốn token
const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 20,
  // Dùng userId làm key nếu đã auth, fallback về IP (dùng ipKeyGenerator để handle IPv6)
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      message: "Bạn đã dùng quá 20 lần/giờ. Vui lòng thử lại sau.",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Các route cần auth + rate limit
router.post("/generate-caption", authenticate, aiRateLimit, generateCaption);
router.post("/suggest-hashtags", authenticate, aiRateLimit, suggestHashtags);

// Kiểm duyệt nội dung — internal, không cần auth (gọi từ post.service)
router.post("/moderate-content", moderateContent);

module.exports = router;

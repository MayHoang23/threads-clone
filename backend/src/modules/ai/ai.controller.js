const aiService = require("./ai.service");
const AppError = require("../../utils/AppError");

// POST /api/v1/ai/generate-caption
const generateCaption = async (req, res, next) => {
  try {
    const { idea, tone } = req.body;
    if (!idea?.trim()) throw new AppError("Vui lòng nhập ý tưởng cho caption", 400);
    if (idea.length > 500) throw new AppError("Ý tưởng không được vượt quá 500 ký tự", 400);

    const captions = await aiService.generateCaption(idea.trim(), tone);

    res.json({ success: true, data: { captions }, message: "Tạo caption thành công" });
  } catch (err) {
    // Lỗi parse JSON từ AI response — trả về 500 thay vì crash
    if (err instanceof SyntaxError) {
      return next(new AppError("AI trả về dữ liệu không hợp lệ, vui lòng thử lại", 500));
    }
    next(err);
  }
};

// POST /api/v1/ai/suggest-hashtags
const suggestHashtags = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) throw new AppError("Vui lòng nhập nội dung để gợi ý hashtag", 400);
    if (content.length > 1000) throw new AppError("Nội dung không được vượt quá 1000 ký tự", 400);

    const hashtags = await aiService.suggestHashtags(content.trim());

    res.json({ success: true, data: { hashtags }, message: "Gợi ý hashtag thành công" });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return next(new AppError("AI trả về dữ liệu không hợp lệ, vui lòng thử lại", 500));
    }
    next(err);
  }
};

// POST /api/v1/ai/moderate-content (internal, không cần auth)
const moderateContent = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.json({ success: true, data: { isSafe: true, reason: "", severity: "low" } });

    const result = await aiService.moderateContent(content);
    res.json({ success: true, data: result, message: "Kiểm duyệt hoàn tất" });
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Nếu AI lỗi khi kiểm duyệt → cho phép đăng để không block user
      return res.json({ success: true, data: { isSafe: true, reason: "", severity: "low" } });
    }
    next(err);
  }
};

module.exports = { generateCaption, suggestHashtags, moderateContent };

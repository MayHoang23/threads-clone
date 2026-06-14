const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");
const postService = require("./post.service");
const notificationService = require("../notifications/notification.service");

// ========================
// POST /api/v1/posts/:id/repost — repost (đăng lại) bài viết
// ========================
const repostPost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const originalId = req.params.id;

    const original = await prisma.post.findFirst({
      where: { id: originalId, isHidden: false },
    });
    if (!original) throw new AppError("Bài viết không tồn tại", 404);

    // Không repost bài của chính mình
    if (original.authorId === userId) {
      throw new AppError("Không thể repost bài viết của chính mình", 400);
    }

    // Không repost 2 lần
    const existing = await prisma.post.findFirst({
      where: { authorId: userId, repostOfId: originalId },
    });
    if (existing) throw new AppError("Bạn đã repost bài viết này rồi", 400);

    const repost = await prisma.post.create({
      data: { authorId: userId, repostOfId: originalId, content: null },
    });

    // Notification REPOST cho tác giả bài gốc — fire-and-forget
    notificationService
      .createNotification("REPOST", userId, original.authorId, originalId)
      .catch(() => {});

    // Trả về bài repost đầy đủ (kèm repostOf lồng bên trong)
    const full = await postService.getPostById(repost.id, userId);
    res.status(201).json({ success: true, data: full, message: "Đã repost" });
  } catch (err) {
    next(err);
  }
};

// ========================
// DELETE /api/v1/posts/:id/repost — bỏ repost
// ========================
const unrepostPost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const originalId = req.params.id;

    const repost = await prisma.post.findFirst({
      where: { authorId: userId, repostOfId: originalId },
    });
    if (!repost) throw new AppError("Bạn chưa repost bài viết này", 400);

    await prisma.post.delete({ where: { id: repost.id } });
    res.json({ success: true, data: null, message: "Đã bỏ repost" });
  } catch (err) {
    next(err);
  }
};

// ========================
// POST /api/v1/posts/:id/quote — quote post (trích dẫn bài viết)
// ========================
const quotePost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const quotedPostId = req.params.id;
    const { content, privacy, mediaUrls } = req.body;

    const original = await prisma.post.findFirst({
      where: { id: quotedPostId, isHidden: false },
    });
    if (!original) throw new AppError("Bài viết không tồn tại", 404);

    // Tái sử dụng createPost: kiểm duyệt AI + hashtag + media + format đồng nhất
    const post = await postService.createPost(userId, {
      content,
      privacy,
      mediaUrls: mediaUrls || [],
      quotedPostId,
    });

    // Notification REPOST cho tác giả bài gốc (createNotification tự bỏ qua nếu là chính mình)
    notificationService
      .createNotification("REPOST", userId, original.authorId, quotedPostId)
      .catch(() => {});

    res.status(201).json({ success: true, data: post, message: "Đã đăng bài trích dẫn" });
  } catch (err) {
    next(err);
  }
};

// ========================
// GET /api/v1/posts/:id/reposts — danh sách người đã repost bài viết
// ========================
const getReposts = async (req, res, next) => {
  try {
    const reposts = await prisma.post.findMany({
      where: { repostOfId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: { author: { select: postService.AUTHOR_SELECT } },
    });
    res.json({ success: true, data: reposts.map((r) => r.author), message: "" });
  } catch (err) {
    next(err);
  }
};

module.exports = { repostPost, unrepostPost, quotePost, getReposts };

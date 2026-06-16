const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");
const notificationService = require("../notifications/notification.service");
const { AUTHOR_SELECT } = require("./post.service");

// ========================
// HELPERS
// ========================

// Include cho 1 comment — kèm user, đếm like/reply, và like của chính user (nếu đăng nhập)
const buildCommentInclude = (userId, withReplies) => {
  const likeOfMe = userId
    ? { likes: { where: { userId }, select: { id: true } } }
    : {};

  const include = {
    user: { select: AUTHOR_SELECT },
    _count: { select: { likes: true, replies: true } },
    ...likeOfMe,
  };

  if (withReplies) {
    include.replies = {
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: AUTHOR_SELECT },
        _count: { select: { likes: true } },
        ...likeOfMe,
      },
    };
  }

  return include;
};

// Chuyển raw Prisma comment → object gọn gàng (đệ quy cho replies)
function formatComment(c, userId = null) {
  return {
    id: c.id,
    content: c.content,
    mediaUrl: c.mediaUrl,
    parentId: c.parentId,
    createdAt: c.createdAt,
    user: c.user,
    likeCount: c._count?.likes ?? 0,
    isLikedByMe: userId ? (c.likes?.length > 0) : false,
    replyCount: c._count?.replies ?? 0,
    replies: (c.replies ?? []).map((r) => formatComment(r, userId)),
  };
}

// ========================
// GET /api/v1/posts/:id/comments?cursor=xxx
// Lấy comment gốc (parentId = null) kèm replies — cursor pagination 10/trang
// ========================
const getComments = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user?.id || null;
    const cursor = req.query.cursor || null;
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new AppError("Bài viết không tồn tại", 404);

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: buildCommentInclude(userId, true),
    });

    const hasMore = comments.length > limit;
    if (hasMore) comments.pop();

    res.json({
      success: true,
      data: {
        comments: comments.map((c) => formatComment(c, userId)),
        nextCursor: hasMore ? comments[comments.length - 1]?.id : null,
        hasMore,
      },
      message: "",
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// POST /api/v1/posts/:id/comments
// Body: { content, mediaUrl?, parentId? } — parentId có giá trị = reply (tối đa 2 cấp)
// ========================
const createComment = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { content, mediaUrl, parentId } = req.body;
    const userId = req.user.id;

    // Cho phép comment chỉ có ảnh (không bắt buộc text khi có mediaUrl)
    if (!content?.trim() && !mediaUrl) {
      throw new AppError("Bình luận phải có nội dung hoặc ảnh", 400);
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) throw new AppError("Bài viết không tồn tại", 404);

    // Nếu là reply → kiểm tra comment gốc hợp lệ + chặn reply của reply (max 2 cấp)
    let parentComment = null;
    if (parentId) {
      parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, parentId: true, userId: true },
      });
      if (!parentComment) throw new AppError("Bình luận gốc không tồn tại", 404);
      if (parentComment.postId !== postId) {
        throw new AppError("Bình luận không thuộc bài viết này", 400);
      }
      if (parentComment.parentId !== null) {
        throw new AppError("Chỉ được trả lời tối đa 2 cấp", 400);
      }
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        postId,
        content: content?.trim() || "",
        mediaUrl: mediaUrl || null,
        parentId: parentId || null,
      },
      include: buildCommentInclude(userId, true),
    });

    // Notification COMMENT cho tác giả bài viết (tự bỏ qua nếu là chính mình)
    notificationService
      .createNotification("COMMENT", userId, post.authorId, postId)
      .catch(() => {});

    // Nếu là reply → thêm notification cho tác giả comment gốc
    // (bỏ qua khi trùng tác giả bài viết để tránh thông báo lặp; trùng chính mình đã được createNotification lọc)
    if (parentComment && parentComment.userId !== post.authorId) {
      notificationService
        .createNotification("COMMENT", userId, parentComment.userId, postId)
        .catch(() => {});
    }

    res.status(201).json({
      success: true,
      data: formatComment(comment, userId),
      message: "Đã thêm bình luận",
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// POST /api/v1/comments/:id/like — toggle like/unlike
// ========================
const likeComment = async (req, res, next) => {
  try {
    const { id: commentId } = req.params;
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, postId: true },
    });
    if (!comment) throw new AppError("Bình luận không tồn tại", 404);

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await prisma.commentLike.delete({
        where: { userId_commentId: { userId, commentId } },
      });
    } else {
      await prisma.commentLike.create({ data: { userId, commentId } });
      // Notification COMMENT_LIKE cho tác giả comment (tự bỏ qua nếu like comment của mình)
      notificationService
        .createNotification("COMMENT_LIKE", userId, comment.userId, comment.postId)
        .catch(() => {});
    }

    const likeCount = await prisma.commentLike.count({ where: { commentId } });

    res.json({
      success: true,
      data: { liked: !existing, likeCount },
      message: existing ? "Đã bỏ thích bình luận" : "Đã thích bình luận",
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// DELETE /api/v1/comments/:id — chỉ tác giả hoặc admin
// ========================
const deleteComment = async (req, res, next) => {
  try {
    const { id: commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    });
    if (!comment) throw new AppError("Bình luận không tồn tại", 404);

    const isOwner = comment.userId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      throw new AppError("Bạn không có quyền xóa bình luận này", 403);
    }

    // Cascade trong schema tự xoá: replies con + CommentLike
    await prisma.comment.delete({ where: { id: commentId } });

    res.json({ success: true, data: null, message: "Đã xóa bình luận" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getComments, createComment, likeComment, deleteComment };

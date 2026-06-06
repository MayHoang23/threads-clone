const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");

// ========================
// HELPER FUNCTIONS
// ========================

// Trích xuất hashtag từ nội dung: "#threads" → ["threads"]
function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#(\w+)/g) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

// Các trường cần select cho author — dùng lại ở nhiều chỗ
const AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  isVerified: true,
};

// Tạo include object cho post — có hoặc không có userId (để biết isLiked, isSaved)
const getPostInclude = (userId) => {
  const include = {
    author: { select: AUTHOR_SELECT },
    media: { select: { id: true, url: true, type: true } },
    _count: { select: { likes: true, comments: true } },
    hashtags: { include: { hashtag: { select: { name: true } } } },
  };
  // Chỉ query likes/savedBy khi có userId (để check isLiked, isSaved)
  if (userId) {
    include.likes = { where: { userId }, select: { id: true } };
    include.savedBy = { where: { userId }, select: { id: true } };
  }
  return include;
};

// Chuyển raw Prisma post → response object gọn gàng
function formatPost(post, userId = null) {
  return {
    id: post.id,
    content: post.content,
    privacy: post.privacy,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    media: post.media,
    hashtags: post.hashtags?.map((ph) => ph.hashtag.name) ?? [],
    likeCount: post._count?.likes ?? 0,
    commentCount: post._count?.comments ?? 0,
    // Nếu không có userId (chưa đăng nhập) → false
    isLiked: userId ? (post.likes?.length > 0) : false,
    isSaved: userId ? (post.savedBy?.length > 0) : false,
  };
}

// ========================
// TẠO BÀI VIẾT
// ========================
const createPost = async (userId, { content, privacy = "PUBLIC", mediaUrls = [] }) => {
  if (!content?.trim() && mediaUrls.length === 0) {
    throw new AppError("Bài viết phải có nội dung hoặc ảnh/video", 400);
  }

  const tagNames = extractHashtags(content);

  // Dùng transaction: đảm bảo post + media + hashtags được tạo đồng thời
  // Nếu 1 bước lỗi → rollback hết
  const post = await prisma.$transaction(async (tx) => {
    const newPost = await tx.post.create({
      data: {
        authorId: userId,
        content: content?.trim() || null,
        privacy,
      },
    });

    // Tạo media nếu có
    if (mediaUrls.length > 0) {
      await tx.media.createMany({
        data: mediaUrls.map(({ url, type }) => ({
          url,
          type: type.toUpperCase(),
          postId: newPost.id,
        })),
      });
    }

    // Upsert hashtag: tạo mới nếu chưa có, giữ nguyên nếu đã có
    for (const name of tagNames) {
      const hashtag = await tx.hashtag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await tx.postHashtag.create({
        data: { postId: newPost.id, hashtagId: hashtag.id },
      });
    }

    return newPost;
  });

  // Query lại để trả về đủ thông tin
  const fullPost = await prisma.post.findUnique({
    where: { id: post.id },
    include: getPostInclude(userId),
  });

  return formatPost(fullPost, userId);
};

// ========================
// LẤY NEWSFEED — cursor-based pagination
// ========================
// cursor: ID của bài cuối cùng đã load → lấy bài cũ hơn bài đó
const getFeed = async (userId, cursor = null, limit = 10) => {
  // Lấy ID những người mình đang follow
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  // Feed = bài của mình + bài của người mình follow
  const authorIds = [...followingIds, userId];

  // Lấy danh sách bạn bè (để kiểm tra bài có privacy FRIENDS)
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
    select: { requesterId: true, receiverId: true },
  });
  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.receiverId : f.requesterId
  );

  // Lấy limit+1 để kiểm tra còn trang tiếp theo không
  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: authorIds },
      OR: [
        // PUBLIC: mọi người đều thấy
        { privacy: "PUBLIC" },
        // PRIVATE: chỉ tác giả thấy bài của mình
        { privacy: "PRIVATE", authorId: userId },
        // FRIENDS: tác giả + những người là bạn bè của tác giả
        { privacy: "FRIENDS", authorId: { in: [userId, ...friendIds] } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    // cursor-based: bỏ qua bài cursor và lấy từ bài tiếp theo
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: getPostInclude(userId),
  });

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop(); // Bỏ bài thứ limit+1, chỉ dùng để check hasMore

  return {
    posts: posts.map((p) => formatPost(p, userId)),
    nextCursor: hasMore ? posts[posts.length - 1]?.id : null,
    hasMore,
  };
};

// ========================
// XEM CHI TIẾT BÀI VIẾT
// ========================
const getPostById = async (postId, userId = null) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: getPostInclude(userId),
  });

  if (!post) throw new AppError("Bài viết không tồn tại", 404);

  // Kiểm tra quyền xem theo privacy
  if (post.privacy === "PRIVATE" && post.authorId !== userId) {
    throw new AppError("Bài viết này ở chế độ riêng tư", 403);
  }

  if (post.privacy === "FRIENDS" && post.authorId !== userId) {
    if (!userId) throw new AppError("Bài viết này chỉ dành cho bạn bè", 403);

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: userId, receiverId: post.authorId },
          { requesterId: post.authorId, receiverId: userId },
        ],
      },
    });
    if (!friendship) throw new AppError("Bài viết này chỉ dành cho bạn bè", 403);
  }

  return formatPost(post, userId);
};

// ========================
// CẬP NHẬT BÀI VIẾT
// ========================
const updatePost = async (postId, userId, { content, privacy }) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404);
  if (post.authorId !== userId) {
    throw new AppError("Bạn không có quyền sửa bài viết này", 403);
  }

  const newTagNames = extractHashtags(content);

  const updated = await prisma.$transaction(async (tx) => {
    // Xóa hashtag cũ trước khi gắn hashtag mới
    await tx.postHashtag.deleteMany({ where: { postId } });

    for (const name of newTagNames) {
      const hashtag = await tx.hashtag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await tx.postHashtag.create({
        data: { postId, hashtagId: hashtag.id },
      });
    }

    return tx.post.update({
      where: { id: postId },
      data: {
        ...(content !== undefined && { content: content.trim() }),
        ...(privacy !== undefined && { privacy }),
      },
      include: getPostInclude(userId),
    });
  });

  return formatPost(updated, userId);
};

// ========================
// XÓA BÀI VIẾT
// ========================
const deletePost = async (postId, userId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404);
  if (post.authorId !== userId) {
    throw new AppError("Bạn không có quyền xóa bài viết này", 403);
  }
  // Cascade trong schema tự xóa: media, likes, comments, savedBy, hashtags, notifications
  await prisma.post.delete({ where: { id: postId } });
};

// ========================
// TOGGLE LIKE (like / unlike)
// ========================
const toggleLike = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404);

  // Prisma tạo compound key: userId_postId từ @@unique([userId, postId])
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
  } else {
    await prisma.like.create({ data: { userId, postId } });
  }

  const count = await prisma.like.count({ where: { postId } });
  return { liked: !existing, count };
};

// ========================
// TẠO COMMENT (comment gốc hoặc reply)
// ========================
const createComment = async (userId, postId, content, parentId = null) => {
  if (!content?.trim()) throw new AppError("Nội dung comment không được trống", 400);

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404);

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError("Comment gốc không tồn tại", 404);
    if (parent.postId !== postId) throw new AppError("Comment không thuộc bài viết này", 400);
    // Chỉ cho phép reply 1 cấp: parent phải là comment gốc
    if (parent.parentId !== null) throw new AppError("Chỉ được phép reply 1 cấp", 400);
  }

  return prisma.comment.create({
    data: { userId, postId, content: content.trim(), parentId },
    include: {
      user: { select: AUTHOR_SELECT },
      replies: { include: { user: { select: AUTHOR_SELECT } } },
    },
  });
};

// ========================
// LẤY COMMENTS CỦA BÀI VIẾT
// ========================
const getComments = async (postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404);

  // Chỉ lấy comment gốc (parentId null), kèm replies lồng bên trong
  return prisma.comment.findMany({
    where: { postId, parentId: null },
    include: {
      user: { select: AUTHOR_SELECT },
      replies: {
        include: { user: { select: AUTHOR_SELECT } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
};

// ========================
// TOGGLE SAVE (lưu / bỏ lưu)
// ========================
const toggleSave = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404);

  const existing = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.savedPost.delete({ where: { userId_postId: { userId, postId } } });
  } else {
    await prisma.savedPost.create({ data: { userId, postId } });
  }

  return { saved: !existing };
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

const prisma = require("../../utils/prisma");
const { formatPost, getPostInclude } = require("../posts/post.service");

// ========================
// LẤY BÀI VIẾT THEO HASHTAG — cursor pagination giống getFeed
// ========================
const getPostsByHashtag = async (name, userId = null, cursor = null, limit = 10) => {
  // Chuẩn hóa tên hashtag: bỏ dấu # nếu có, chuyển về chữ thường
  const tagName = name.toLowerCase().replace(/^#/, "");

  const hashtag = await prisma.hashtag.findUnique({
    where: { name: tagName },
    include: { _count: { select: { posts: true } } },
  });

  // Hashtag chưa tồn tại → trả danh sách rỗng (không coi là lỗi)
  if (!hashtag) {
    return { posts: [], nextCursor: null, hasMore: false, postCount: 0 };
  }

  // Lấy danh sách bạn bè để lọc bài FRIENDS (giống getFeed)
  let friendIds = [];
  if (userId) {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });
    friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.receiverId : f.requesterId
    );
  }

  const posts = await prisma.post.findMany({
    where: {
      isHidden: false, // Bỏ qua bài đã bị admin ẩn
      hashtags: { some: { hashtagId: hashtag.id } },
      OR: [
        // PUBLIC: ai cũng thấy
        { privacy: "PUBLIC" },
        // PRIVATE / FRIENDS: chỉ áp dụng khi đã đăng nhập
        ...(userId
          ? [
              { privacy: "PRIVATE", authorId: userId },
              { privacy: "FRIENDS", authorId: { in: [userId, ...friendIds] } },
            ]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: getPostInclude(userId),
  });

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop();

  return {
    posts: posts.map((p) => formatPost(p, userId)),
    nextCursor: hasMore ? posts[posts.length - 1]?.id : null,
    hasMore,
    postCount: hashtag._count.posts,
  };
};

module.exports = { getPostsByHashtag };

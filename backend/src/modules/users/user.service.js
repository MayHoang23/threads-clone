const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");
const notificationService = require("../notifications/notification.service");

// Các trường select cho user — dùng lại ở nhiều chỗ
const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  isVerified: true,
  isPrivate: true,
  role: true,
};

// ========================
// XEM PROFILE USER
// ========================
// Trả về thông tin profile + thống kê + trạng thái quan hệ với currentUser
const getUserProfile = async (username, currentUserId = null) => {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      coverImage: true,
      bio: true,
      isVerified: true,
      isPrivate: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          followers: true, // số người follow mình
          following: true, // số người mình follow
        },
      },
    },
  });

  if (!user) throw new AppError("Người dùng không tồn tại", 404);

  // Mặc định chưa follow và chưa là bạn
  let isFollowing = false;
  let isFriend = false;

  if (currentUserId && currentUserId !== user.id) {
    // Kiểm tra currentUser có đang follow user này không
    const followRecord = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: user.id,
        },
      },
    });
    isFollowing = !!followRecord;

    // Kiểm tra hai người có là bạn bè (ACCEPTED) không
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: currentUserId, receiverId: user.id },
          { requesterId: user.id, receiverId: currentUserId },
        ],
      },
    });
    isFriend = !!friendship;
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    coverImage: user.coverImage,
    bio: user.bio,
    isVerified: user.isVerified,
    isPrivate: user.isPrivate,
    role: user.role,
    createdAt: user.createdAt,
    postCount: user._count.posts,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing,
    isFriend,
  };
};

// ========================
// CẬP NHẬT PROFILE
// ========================
const updateProfile = async (userId, { displayName, bio, avatar, coverImage, isPrivate }) => {
  // Chỉ cập nhật các trường được truyền vào (không ghi đè trường không có)
  const data = {};
  if (displayName !== undefined) data.displayName = displayName.trim() || null;
  if (bio !== undefined) data.bio = bio.trim() || null;
  if (avatar !== undefined) data.avatar = avatar;
  if (coverImage !== undefined) data.coverImage = coverImage;
  if (isPrivate !== undefined) data.isPrivate = Boolean(isPrivate);

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      coverImage: true,
      bio: true,
      isPrivate: true,
      isVerified: true,
      role: true,
    },
  });

  return updated;
};

// ========================
// LẤY BÀI VIẾT CỦA USER (cursor pagination)
// ========================
const getUserPosts = async (username, currentUserId = null, cursor = null, limit = 10) => {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new AppError("Người dùng không tồn tại", 404);

  // Xác định bộ lọc privacy dựa theo mối quan hệ
  let privacyFilter;
  if (currentUserId === user.id) {
    // Xem bài của chính mình → thấy tất cả
    privacyFilter = [{ privacy: "PUBLIC" }, { privacy: "FRIENDS" }, { privacy: "PRIVATE" }];
  } else {
    // Kiểm tra có là bạn không để quyết định có thấy bài FRIENDS
    const isFriend = currentUserId
      ? !!(await prisma.friendship.findFirst({
          where: {
            status: "ACCEPTED",
            OR: [
              { requesterId: currentUserId, receiverId: user.id },
              { requesterId: user.id, receiverId: currentUserId },
            ],
          },
        }))
      : false;

    privacyFilter = isFriend
      ? [{ privacy: "PUBLIC" }, { privacy: "FRIENDS" }]
      : [{ privacy: "PUBLIC" }];
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      OR: privacyFilter,
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      author: { select: USER_SELECT },
      media: { select: { id: true, url: true, type: true } },
      _count: { select: { likes: true, comments: true } },
      hashtags: { include: { hashtag: { select: { name: true } } } },
      ...(currentUserId && {
        likes: { where: { userId: currentUserId }, select: { id: true } },
        savedBy: { where: { userId: currentUserId }, select: { id: true } },
      }),
    },
  });

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop();

  const formatted = posts.map((p) => ({
    id: p.id,
    content: p.content,
    privacy: p.privacy,
    createdAt: p.createdAt,
    author: p.author,
    media: p.media,
    hashtags: p.hashtags.map((ph) => ph.hashtag.name),
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    isLiked: currentUserId ? p.likes?.length > 0 : false,
    isSaved: currentUserId ? p.savedBy?.length > 0 : false,
  }));

  return {
    posts: formatted,
    nextCursor: hasMore ? posts[posts.length - 1]?.id : null,
    hasMore,
  };
};

// ========================
// TOGGLE FOLLOW (follow / unfollow)
// ========================
const toggleFollow = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new AppError("Bạn không thể tự follow chính mình", 400);
  }

  const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
  if (!targetUser) throw new AppError("Người dùng không tồn tại", 404);

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing) {
    // Đang follow → unfollow
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { following: false };
  } else {
    // Chưa follow → follow
    await prisma.follow.create({ data: { followerId, followingId } });
    // Tạo notification FOLLOW — chỉ khi follow mới, không tạo khi unfollow
    notificationService
      .createNotification("FOLLOW", followerId, followingId)
      .catch(() => {});
    return { following: true };
  }
};

// ========================
// LẤY DANH SÁCH FOLLOWERS (người follow mình)
// ========================
const getFollowers = async (userId, currentUserId = null) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Người dùng không tồn tại", 404);

  const follows = await prisma.follow.findMany({
    where: { followingId: userId },
    include: { follower: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  const followerList = follows.map((f) => f.follower);

  if (currentUserId) {
    const myFollows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: followerList.map((u) => u.id) },
      },
      select: { followingId: true },
    });
    const myFollowingIds = new Set(myFollows.map((f) => f.followingId));
    return followerList.map((u) => ({
      ...u,
      isFollowing: myFollowingIds.has(u.id),
    }));
  }
  return followerList.map((u) => ({ ...u, isFollowing: false }));
};

// ========================
// LẤY DANH SÁCH FOLLOWING (người mình đang follow)
// ========================
const getFollowing = async (userId, currentUserId = null) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Người dùng không tồn tại", 404);

  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    include: { following: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  const followingList = follows.map((f) => f.following);

  if (currentUserId) {
    const myFollows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: followingList.map((u) => u.id) },
      },
      select: { followingId: true },
    });
    const myFollowingIds = new Set(myFollows.map((f) => f.followingId));
    return followingList.map((u) => ({
      ...u,
      isFollowing: myFollowingIds.has(u.id),
    }));
  }
  return followingList.map((u) => ({ ...u, isFollowing: false }));
};

// ========================
// GỬI LỜI MỜI KẾT BẠN
// ========================
const sendFriendRequest = async (requesterId, receiverId) => {
  if (requesterId === receiverId) {
    throw new AppError("Bạn không thể gửi lời mời cho chính mình", 400);
  }

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) throw new AppError("Người dùng không tồn tại", 404);

  // Kiểm tra đã có lời mời chưa (cả 2 chiều)
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      throw new AppError("Hai người đã là bạn bè", 400);
    }
    if (existing.status === "PENDING") {
      throw new AppError("Lời mời kết bạn đã được gửi trước đó", 400);
    }
    // Status REJECTED → cho phép gửi lại bằng cách cập nhật thành PENDING
    if (existing.requesterId === requesterId) {
      return prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "PENDING" },
      });
    }
  }

  return prisma.friendship.create({
    data: { requesterId, receiverId, status: "PENDING" },
  });
};

// ========================
// PHẢN HỒI LỜI MỜI KẾT BẠN (accept / reject)
// ========================
// Chỉ người nhận lời mời (receiver) mới có quyền phản hồi
const respondFriendRequest = async (userId, requestId, action) => {
  if (!["accept", "reject"].includes(action)) {
    throw new AppError("Hành động không hợp lệ, chỉ chấp nhận: accept hoặc reject", 400);
  }

  const request = await prisma.friendship.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Lời mời kết bạn không tồn tại", 404);

  // Chỉ người nhận mới được phản hồi
  if (request.receiverId !== userId) {
    throw new AppError("Bạn không có quyền phản hồi lời mời này", 403);
  }

  if (request.status !== "PENDING") {
    throw new AppError("Lời mời này đã được xử lý trước đó", 400);
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

  return prisma.friendship.update({
    where: { id: requestId },
    data: { status: newStatus },
  });
};

// ========================
// LẤY LỜI MỜI KẾT BẠN ĐẾN
// ========================
const getFriendRequests = async (userId) => {
  const requests = await prisma.friendship.findMany({
    where: { receiverId: userId, status: "PENDING" },
    include: { requester: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    requester: r.requester,
  }));
};

// ========================
// GỢI Ý NGƯỜI THEO DÕI
// ========================
// Lấy tối đa 5 user chưa follow, không phải chính mình, không bị ban
const getSuggestions = async (currentUserId, limit = 5) => {
  // Những người mình đang follow → loại khỏi gợi ý
  const following = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: [...followingIds, currentUserId] },
      isBanned: false,
    },
    select: USER_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return users.map((u) => ({ ...u, isFollowing: false }));
};

// ========================
// TÌM KIẾM (user + post + hashtag)
// ========================
const search = async (query, currentUserId = null) => {
  if (!query?.trim()) throw new AppError("Từ khóa tìm kiếm không được để trống", 400);

  const q = query.trim();

  // Tìm user theo username hoặc displayName (không phân biệt hoa thường)
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
      isBanned: false,
    },
    select: USER_SELECT,
    take: 10,
  });

  // Check isFollowing cho từng user trong kết quả search
  let followingIds = new Set();
  if (currentUserId) {
    const follows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: users.map((u) => u.id) },
      },
      select: { followingId: true },
    });
    followingIds = new Set(follows.map((f) => f.followingId));
  }
  const usersWithFollow = users.map((u) => ({
    ...u,
    isFollowing: followingIds.has(u.id),
  }));

  // Tìm bài viết có nội dung chứa từ khóa (chỉ PUBLIC)
  const posts = await prisma.post.findMany({
    where: {
      content: { contains: q, mode: "insensitive" },
      privacy: "PUBLIC",
    },
    include: {
      author: { select: USER_SELECT },
      media: { select: { id: true, url: true, type: true } },
      _count: { select: { likes: true, comments: true } },
      hashtags: { include: { hashtag: { select: { name: true } } } },
      ...(currentUserId && {
        likes: { where: { userId: currentUserId }, select: { id: true } },
        savedBy: { where: { userId: currentUserId }, select: { id: true } },
      }),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Tìm hashtag chứa từ khóa (bỏ dấu # nếu người dùng nhập vào)
  const hashtagQuery = q.startsWith("#") ? q.slice(1) : q;
  const hashtags = await prisma.hashtag.findMany({
    where: { name: { contains: hashtagQuery, mode: "insensitive" } },
    include: { _count: { select: { posts: true } } },
    take: 10,
  });

  const formattedPosts = posts.map((p) => ({
    id: p.id,
    content: p.content,
    privacy: p.privacy,
    createdAt: p.createdAt,
    author: p.author,
    media: p.media,
    hashtags: p.hashtags.map((ph) => ph.hashtag.name),
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    isLiked: currentUserId ? p.likes?.length > 0 : false,
    isSaved: currentUserId ? p.savedBy?.length > 0 : false,
  }));

  return {
    users: usersWithFollow,
    posts: formattedPosts,
    hashtags: hashtags.map((h) => ({ name: h.name, postCount: h._count.posts })),
  };
};

module.exports = {
  getUserProfile,
  updateProfile,
  getUserPosts,
  toggleFollow,
  getFollowers,
  getFollowing,
  sendFriendRequest,
  respondFriendRequest,
  getFriendRequests,
  getSuggestions,
  search,
};

const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");
const { createPostHiddenNotification } = require("../notifications/notification.service");
const { getTrendingHashtags } = require("../posts/post.service");

// Dashboard — thống kê tổng quan + biểu đồ 7 ngày + top hashtag
const getDashboardStats = async () => {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const [totalUsers, totalPosts, totalReports, newUsersToday,
    postsLast7Days, usersLast7Days, topHashtags] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { createdAt: { gte: today } } }),

    Promise.all(last7Days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = await prisma.post.count({
        where: { createdAt: { gte: day, lt: nextDay } },
      });
      return {
        date: day.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        count,
      };
    })),

    Promise.all(last7Days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = await prisma.user.count({
        where: { createdAt: { gte: day, lt: nextDay } },
      });
      return {
        date: day.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        count,
      };
    })),

    prisma.hashtag.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { posts: { _count: "desc" } },
      take: 5,
    }).then(hs => hs
      .filter(h => h._count.posts > 0)
      .map(h => ({ name: h.name, postCount: h._count.posts }))
    ),
  ]);

  return {
    totalUsers, totalPosts, totalReports, newUsersToday,
    postsLast7Days, usersLast7Days, topHashtags,
  };
};

// ── USERS ──────────────────────────────

// Danh sách users — search + filter + sort + pagination (offset)
const getUsers = async ({ page = 1, limit = 20, search = "", role = "", banned = "" }) => {
  const where = {
    ...(search && {
      OR: [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(role && { role }),
    ...(banned !== "" && { isBanned: banned === "true" }),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, email: true, displayName: true,
        avatar: true, role: true, isBanned: true, emailVerified: true,
        createdAt: true,
        _count: { select: { posts: true, followers: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { users, total, page, totalPages: Math.ceil(total / limit) };
};

// Ban / Unban user
const toggleBanUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User không tồn tại", 404);
  if (user.role === "ADMIN") throw new AppError("Không thể ban tài khoản Admin", 403);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isBanned: !user.isBanned },
    select: { id: true, isBanned: true },
  });
  return updated;
};

// Đổi role user
const updateUserRole = async (userId, role) => {
  if (!["USER", "ADMIN"].includes(role)) throw new AppError("Role không hợp lệ", 400);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, role: true },
  });
  return updated;
};

// Xóa user
const deleteUser = async (userId, adminId) => {
  if (userId === adminId) throw new AppError("Không thể tự xóa tài khoản của mình", 403);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User không tồn tại", 404);
  if (user.role === "ADMIN") throw new AppError("Không thể xóa tài khoản Admin", 403);
  await prisma.user.delete({ where: { id: userId } });
  return { message: "Đã xóa user thành công" };
};

// ── POSTS ─────────────────────────────

// Danh sách posts — search + filter hidden + pagination (offset)
const getPosts = async ({ page = 1, limit = 20, search = "", hidden = "" }) => {
  const where = {
    ...(search && { content: { contains: search, mode: "insensitive" } }),
    // hidden = "" → tất cả; "true" → chỉ bài ẩn; "false" → chỉ bài hiển thị
    ...(hidden !== "" && { isHidden: hidden === "true" }),
  };
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);
  return { posts, total, page, totalPages: Math.ceil(total / limit) };
};

// Xóa post
const deletePost = async (postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404);
  await prisma.post.delete({ where: { id: postId } });
  return { message: "Đã xóa bài viết thành công" };
};

// ── REPORTS ───────────────────────────

// Danh sách reports — filter + pagination
const getReports = async ({ page = 1, limit = 20, status = "" }) => {
  const where = status ? { status } : {};
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        // Quan hệ trong model Report tên là `user` (người báo cáo), không phải `reporter`
        user: { select: { id: true, username: true, avatar: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);
  return { reports, total, page, totalPages: Math.ceil(total / limit) };
};

// Resolve report
const resolveReport = async (reportId, action = "reviewed") => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError("Report không tồn tại", 404);
  // Enum ReportStatus chỉ có PENDING | REVIEWED | DISMISSED (không có RESOLVED)
  const status = action === "dismissed" ? "DISMISSED" : "REVIEWED";

  // Nếu xử lý vi phạm và report gắn với 1 bài → ẩn bài viết (thay vì xóa)
  if (action === "reviewed" && report.postId) {
    // Post model dùng `authorId` (không phải userId) làm chủ bài
    const post = await prisma.post.update({
      where: { id: report.postId },
      data: { isHidden: true },
      select: { id: true, authorId: true },
    });
    // Gửi notification cho chủ bài
    await createPostHiddenNotification(post.id, post.authorId);
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status },
  });
  return updated;
};

// Khôi phục bài viết đã bị ẩn
const restorePost = async (postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404);
  return prisma.post.update({
    where: { id: postId },
    data: { isHidden: false },
  });
};

// ── HASHTAGS ──────────────────────────

// Lấy tất cả hashtag + số bài, có search + pagination
const getHashtags = async ({ page = 1, limit = 20, search = "" }) => {
  const where = search
    ? { name: { contains: search, mode: "insensitive" } }
    : {};
  const [hashtags, total] = await Promise.all([
    prisma.hashtag.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { posts: { _count: "desc" } },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.hashtag.count({ where }),
  ]);
  return {
    hashtags: hashtags.map((h) => ({ id: h.id, name: h.name, postCount: h._count.posts })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// Xóa hashtag (cascade xóa PostHashtag liên quan)
const deleteHashtag = async (hashtagId) => {
  const hashtag = await prisma.hashtag.findUnique({ where: { id: hashtagId } });
  if (!hashtag) throw new AppError("Hashtag không tồn tại", 404);
  await prisma.hashtag.delete({ where: { id: hashtagId } });
  return { message: `Đã xóa #${hashtag.name}` };
};

// Lấy top trending (dùng lại hàm có sẵn)
const getTopHashtags = async (limit = 10) => {
  return getTrendingHashtags(limit);
};

module.exports = {
  getDashboardStats,
  getUsers, toggleBanUser, updateUserRole, deleteUser,
  getPosts, deletePost, restorePost,
  getReports, resolveReport,
  getHashtags, deleteHashtag, getTopHashtags,
};

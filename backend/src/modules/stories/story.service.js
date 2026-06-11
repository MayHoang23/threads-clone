const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");

// Lấy stories feed — stories của những người đang follow, chưa hết hạn
const getStoriesFeed = async (userId) => {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  // Bao gồm cả story của chính mình
  followingIds.push(userId);

  const stories = await prisma.story.findMany({
    where: {
      userId: { in: followingIds },
      expiresAt: { gt: new Date() },
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatar: true } },
      views: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group theo user
  const grouped = {};
  for (const story of stories) {
    if (!grouped[story.userId]) {
      grouped[story.userId] = {
        user: story.user,
        stories: [],
        hasUnviewed: false,
      };
    }
    const viewed = story.views.length > 0;
    grouped[story.userId].stories.push({
      id: story.id,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      caption: story.caption,
      bgColor: story.bgColor,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewed,
    });
    if (!viewed) grouped[story.userId].hasUnviewed = true;
  }

  return Object.values(grouped);
};

// Tạo story mới — story văn bản không có mediaUrl, dùng caption + bgColor
const createStory = async (userId, { mediaUrl = null, mediaType = null, caption, bgColor = null }) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
  return prisma.story.create({
    data: { userId, mediaUrl, mediaType, caption, bgColor, expiresAt },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatar: true } },
    },
  });
};

// Mark đã xem — upsert để xem lại nhiều lần không bị lỗi unique
const viewStory = async (viewerId, storyId) => {
  await prisma.storyView.upsert({
    where: { storyId_userId: { storyId, userId: viewerId } },
    update: {},
    create: { storyId, userId: viewerId },
  });
  return { success: true };
};

// Xóa story (chỉ owner)
const deleteStory = async (userId, storyId) => {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) throw new AppError("Story không tồn tại", 404);
  if (story.userId !== userId) throw new AppError("Không có quyền xóa", 403);
  await prisma.story.delete({ where: { id: storyId } });
  return { success: true };
};

// Cronjob: xóa story hết hạn
const deleteExpiredStories = async () => {
  const result = await prisma.story.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
};

module.exports = { getStoriesFeed, createStory, viewStory, deleteStory, deleteExpiredStories };

const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");
const { sendNotification } = require("../../socket/socketManager");

// Các trường cần select cho người gửi notification
const SENDER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  isVerified: true,
};

// Select cho post — kèm 1 media đầu tiên để hiện thumbnail ở Activity feed
const POST_SELECT = {
  id: true,
  content: true,
  media: { take: 1, select: { url: true, type: true } },
};

// Chuyển raw Prisma notification → object gọn gàng cho client
function formatNotification(n) {
  return {
    id: n.id,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt,
    sender: n.triggered,
    post: n.post
      ? {
          id: n.post.id,
          content: n.post.content,
          media: n.post.media || [],
        }
      : null,
  };
}

// ========================
// TẠO NOTIFICATION + EMIT SOCKET
// Được gọi từ post.service và user.service sau các hành động
// ========================
const createNotification = async (type, triggeredId, receiverId, postId = null) => {
  // Không tạo notification khi tự thực hiện hành động với nội dung của mình
  if (triggeredId === receiverId) return null;

  const notification = await prisma.notification.create({
    data: { type, triggeredId, receiverId, postId, isRead: false },
    include: {
      triggered: { select: SENDER_SELECT },
      post: { select: POST_SELECT },
    },
  });

  // Emit real-time — nếu user đang online sẽ nhận ngay
  // Nếu offline thì notification đã lưu DB, user thấy khi reload
  sendNotification(receiverId, formatNotification(notification));

  return notification;
};

// ========================
// TẠO NOTIFICATION HỆ THỐNG: BÀI VIẾT BỊ ẨN DO VI PHẠM
// Không dùng createNotification vì không có triggeredBy là user (admin/hệ thống)
// ========================
const createPostHiddenNotification = async (postId, receiverId) => {
  const notification = await prisma.notification.create({
    data: {
      type: "POST_HIDDEN",
      receiverId,
      postId,
      isRead: false,
      // triggeredId để null — hành động từ hệ thống, không phải user
    },
    include: {
      post: { select: POST_SELECT },
    },
  });

  // Emit real-time — formatNotification trả sender: null cho loại này
  sendNotification(receiverId, formatNotification(notification));

  return notification;
};

// ========================
// LẤY DANH SÁCH NOTIFICATION (cursor pagination)
// ========================
const getNotifications = async (userId, cursor = null, limit = 20) => {
  const notifications = await prisma.notification.findMany({
    where: { receiverId: userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      triggered: { select: SENDER_SELECT },
      post: { select: POST_SELECT },
    },
  });

  const hasMore = notifications.length > limit;
  if (hasMore) notifications.pop();

  return {
    notifications: notifications.map(formatNotification),
    nextCursor: hasMore ? notifications[notifications.length - 1]?.id : null,
    hasMore,
  };
};

// ========================
// ĐẾM NOTIFICATION CHƯA ĐỌC
// ========================
const getUnreadCount = async (userId) => {
  return prisma.notification.count({
    where: { receiverId: userId, isRead: false },
  });
};

// ========================
// ĐÁNH DẤU 1 NOTIFICATION ĐÃ ĐỌC
// ========================
const markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) throw new AppError("Thông báo không tồn tại", 404);
  // Chỉ người nhận mới được đánh dấu đã đọc
  if (notification.receiverId !== userId) throw new AppError("Không có quyền", 403);

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

// ========================
// ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
// ========================
const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: { receiverId: userId, isRead: false },
    data: { isRead: true },
  });
  return { updatedCount: result.count };
};

// ========================
// XÓA NOTIFICATION
// ========================
const deleteNotification = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) throw new AppError("Thông báo không tồn tại", 404);
  if (notification.receiverId !== userId) throw new AppError("Không có quyền", 403);

  await prisma.notification.delete({ where: { id: notificationId } });
};

module.exports = {
  createNotification,
  createPostHiddenNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");

// Các trường user cần select — dùng lại ở nhiều chỗ
const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  isVerified: true,
};

// ========================
// LẤY DANH SÁCH CONVERSATIONS
// ========================
// Trả về conversations của user, sort theo lastMessageAt (mới nhất trên đầu)
const getConversations = async (userId) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        include: { user: { select: USER_SELECT } },
      },
      // Chỉ lấy tin nhắn cuối cùng để preview
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { username: true } } },
      },
      // _count với where filter — đếm tin chưa đọc (không phải của mình)
      _count: {
        select: {
          messages: {
            where: {
              senderId: { not: userId },
              isRead: false,
            },
          },
        },
      },
    },
    orderBy: [
      // Conversations có tin nhắn → sort theo lastMessageAt
      // Conversations mới tạo chưa có tin → sort theo createdAt
      { lastMessageAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Format lại: lấy info người kia trong cuộc trò chuyện
  return conversations.map((conv) => {
    const otherMember = conv.members.find((m) => m.userId !== userId);
    return {
      id: conv.id,
      otherUser: otherMember?.user ?? null,
      lastMessage: conv.messages[0] ?? null,
      unreadCount: conv._count.messages,
      lastMessageAt: conv.lastMessageAt ?? conv.createdAt,
    };
  });
};

// ========================
// LẤY HOẶC TẠO CONVERSATION
// ========================
// DM chỉ có 2 người — tìm conversation chung, tạo mới nếu chưa có
const getOrCreateConversation = async (userId, otherUserId) => {
  if (userId === otherUserId) {
    throw new AppError("Không thể tự nhắn tin cho chính mình", 400);
  }

  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: USER_SELECT,
  });
  if (!otherUser) throw new AppError("Người dùng không tồn tại", 404);

  // Tìm tất cả conversation mà userId là member
  const myConvIds = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  // Trong đó, tìm conversation mà otherUserId cũng là member
  const shared = await prisma.conversationMember.findFirst({
    where: {
      userId: otherUserId,
      conversationId: { in: myConvIds.map((c) => c.conversationId) },
    },
    include: {
      conversation: {
        include: { members: { include: { user: { select: USER_SELECT } } } },
      },
    },
  });

  if (shared) return { conversation: shared.conversation, created: false };

  // Chưa có → tạo conversation mới với 2 member
  const conversation = await prisma.conversation.create({
    data: {
      members: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
    include: { members: { include: { user: { select: USER_SELECT } } } },
  });

  return { conversation, created: true };
};

// ========================
// LẤY TIN NHẮN (cursor pagination ngược — mới nhất trước)
// ========================
// cursor: ID của tin nhắn cũ nhất đang hiển thị → load tin cũ hơn
const getMessages = async (conversationId, userId, cursor = null, limit = 30) => {
  // Kiểm tra user có phải member không
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new AppError("Bạn không có quyền xem cuộc trò chuyện này", 403);

  // DESC để lấy mới nhất → dùng cursor bằng ID tin cũ nhất đang hiển thị
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  // nextCursor = ID của tin cũ nhất trong batch này (cuối mảng vì DESC)
  const nextCursor = hasMore ? messages[messages.length - 1]?.id : null;

  // Đảo lại để hiển thị theo thứ tự thời gian (cũ → mới)
  messages.reverse();

  return { messages, nextCursor, hasMore };
};

// ========================
// GỬI TIN NHẮN
// ========================
const sendMessage = async (conversationId, senderId, content, mediaUrl = null) => {
  // Kiểm tra sender có phải member không
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
  });
  if (!member) throw new AppError("Bạn không phải thành viên cuộc trò chuyện này", 403);

  const now = new Date();

  // Transaction: tạo tin và cập nhật lastMessageAt cùng lúc
  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        content,
        mediaUrl,
        senderId,
        conversationId,
      },
      include: { sender: { select: USER_SELECT } },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    });
    return msg;
  });

  return message;
};

// ========================
// ĐÁNH DẤU ĐÃ ĐỌC
// ========================
// Đánh dấu tất cả tin chưa đọc trong conversation (không phải của user này) là đã đọc
const markRead = async (conversationId, userId) => {
  // Kiểm tra membership
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new AppError("Bạn không có quyền thực hiện hành động này", 403);

  const { count } = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId }, // Chỉ đánh dấu tin của người kia
      isRead: false,
    },
    data: { isRead: true },
  });

  return { updated: count };
};

// ========================
// ĐẾM SỐ CONVERSATION CÓ TIN CHƯA ĐỌC
// ========================
// Đếm số cuộc trò chuyện mà user là member VÀ có ≥1 tin chưa đọc
// (tin không phải do chính user gửi) — dùng cho badge unread DM trên Navbar
const getUnreadConversationCount = async (userId) => {
  return prisma.conversation.count({
    where: {
      members: { some: { userId } },
      messages: {
        some: {
          senderId: { not: userId },
          isRead: false,
        },
      },
    },
  });
};

module.exports = { getConversations, getOrCreateConversation, getMessages, sendMessage, markRead, getUnreadConversationCount };

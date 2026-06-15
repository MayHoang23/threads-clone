const messageService = require("./message.service");
const AppError = require("../../utils/AppError");
const { emitToConversation, sendDMNotification } = require("../../socket/socketManager");

// GET /api/v1/conversations
const getConversations = async (req, res, next) => {
  try {
    const conversations = await messageService.getConversations(req.user.id);
    res.json({ success: true, data: conversations, message: "Lấy danh sách cuộc trò chuyện thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/conversations
// Body: { userId } — ID của người muốn nhắn tin
const getOrCreate = async (req, res, next) => {
  try {
    const { userId: otherUserId } = req.body;
    if (!otherUserId) throw new AppError("Thiếu userId người nhận", 400);

    const { conversation, created } = await messageService.getOrCreateConversation(
      req.user.id,
      otherUserId
    );
    res.status(created ? 201 : 200).json({
      success: true,
      data: conversation,
      message: created ? "Tạo cuộc trò chuyện mới" : "Lấy cuộc trò chuyện hiện có",
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/conversations/:id/messages?cursor=xxx
const getMessages = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const cursor = req.query.cursor || null;
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);

    const result = await messageService.getMessages(conversationId, req.user.id, cursor, limit);
    res.json({ success: true, data: result, message: "Lấy tin nhắn thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/conversations/:id/messages
// Body: { content, mediaUrl? }
const sendMessage = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { content, mediaUrl } = req.body;

    if (!content?.trim() && !mediaUrl) {
      throw new AppError("Tin nhắn không được trống", 400);
    }

    const message = await messageService.sendMessage(
      conversationId,
      req.user.id,
      content?.trim() || "",
      mediaUrl || null
    );

    // Emit real-time tới tất cả người trong room conversation (kể cả sender)
    emitToConversation(conversationId, "new_message", message);

    // Tìm receiver (người kia) để notify
    // Cần lấy danh sách member của conversation để biết ai là receiver
    const prisma = require("../../utils/prisma");
    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const receiverIds = members
      .map((m) => m.userId)
      .filter((id) => id !== req.user.id);

    // Gửi "new_dm" event vào room cá nhân của receiver — để update badge unread
    for (const receiverId of receiverIds) {
      sendDMNotification(receiverId, {
        conversationId,
        message,
        senderId: req.user.id,
      });
    }

    res.status(201).json({ success: true, data: message, message: "Gửi tin nhắn thành công" });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/conversations/:id/read
const markRead = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const result = await messageService.markRead(conversationId, req.user.id);

    // Notify người kia rằng tin của họ đã được đọc
    emitToConversation(conversationId, "messages_read", {
      conversationId,
      readBy: req.user.id,
    });

    res.json({ success: true, data: result, message: "Đã đánh dấu đã đọc" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/conversations/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await messageService.getUnreadConversationCount(req.user.id);
    res.json({ success: true, data: { count }, message: "Số cuộc trò chuyện chưa đọc" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, getOrCreate, getMessages, sendMessage, markRead, getUnreadCount };

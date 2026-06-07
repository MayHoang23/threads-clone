const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

// Singleton io instance — null cho đến khi initSocket được gọi
let io = null;

// ========================
// KHỞI TẠO SOCKET SERVER
// Gọi 1 lần trong index.js sau khi tạo HTTP server
// ========================
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware xác thực: client phải gửi JWT trong handshake auth
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Thiếu token xác thực"));

    try {
      let decoded;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
      catch { decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
      socket.userId = decoded.userId; // Gắn userId vào socket để dùng sau
      next();
    } catch {
      next(new Error("Token không hợp lệ"));
    }
  });

  io.on("connection", (socket) => {
    // Mỗi user join vào room riêng để nhận notification + DM chính xác
    socket.join(`user_${socket.userId}`);
    console.log(`[Socket] User ${socket.userId} đã kết nối`);

    // ========================
    // DIRECT MESSAGE EVENTS
    // ========================

    // Client join room conversation để nhận tin nhắn real-time
    socket.on("join_conversation", async ({ conversationId }) => {
      if (!conversationId) return;
      // Xác minh user là member trước khi cho join room
      const member = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId: socket.userId } },
      }).catch(() => null);

      if (member) {
        socket.join(`conversation_${conversationId}`);
      }
    });

    // Client rời room conversation (khi đóng chat / navigate away)
    socket.on("leave_conversation", ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation_${conversationId}`);
    });

    // Typing indicator: broadcast cho người kia trong conversation
    socket.on("typing", ({ conversationId }) => {
      if (!conversationId) return;
      // socket.to() emit cho tất cả trong room NGOẠI TRỪ sender
      socket.to(`conversation_${conversationId}`).emit("user_typing", {
        userId: socket.userId,
        conversationId,
      });
    });

    // Stop typing: người dùng ngừng gõ (hoặc sau debounce)
    socket.on("stop_typing", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation_${conversationId}`).emit("user_stop_typing", {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User ${socket.userId} đã ngắt kết nối`);
    });
  });

  return io;
};

// ========================
// GỬI NOTIFICATION REAL-TIME (Notification system)
// Nếu user offline thì bỏ qua (notification đã được lưu DB rồi)
// ========================
const sendNotification = (receiverId, data) => {
  if (!io) return;
  io.to(`user_${receiverId}`).emit("new_notification", data);
};

// ========================
// EMIT VÀO ROOM CONVERSATION (Direct Messages)
// ========================
const emitToConversation = (conversationId, event, data) => {
  if (!io) return;
  io.to(`conversation_${conversationId}`).emit(event, data);
};

// ========================
// GỬI DM NOTIFICATION VÀO ROOM CÁ NHÂN (để update badge)
// ========================
const sendDMNotification = (userId, data) => {
  if (!io) return;
  io.to(`user_${userId}`).emit("new_dm", data);
};

module.exports = { initSocket, sendNotification, emitToConversation, sendDMNotification };

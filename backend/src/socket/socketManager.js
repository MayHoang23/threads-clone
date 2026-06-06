const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId; // Gắn userId vào socket để dùng sau
      next();
    } catch {
      next(new Error("Token không hợp lệ"));
    }
  });

  io.on("connection", (socket) => {
    // Mỗi user join vào room riêng để nhận notification chính xác
    socket.join(`user_${socket.userId}`);
    console.log(`[Socket] User ${socket.userId} đã kết nối`);

    socket.on("disconnect", () => {
      console.log(`[Socket] User ${socket.userId} đã ngắt kết nối`);
    });
  });

  return io;
};

// ========================
// GỬI NOTIFICATION REAL-TIME
// Nếu user offline thì bỏ qua (notification đã được lưu DB rồi)
// ========================
const sendNotification = (receiverId, data) => {
  if (!io) return; // io chưa được khởi tạo (không nên xảy ra trong production)
  io.to(`user_${receiverId}`).emit("new_notification", data);
};

module.exports = { initSocket, sendNotification };

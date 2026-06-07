const http = require("http");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./modules/auth/auth.routes");
const postRoutes = require("./modules/posts/post.routes");
const userRoutes = require("./modules/users/user.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const mediaRoutes = require("./modules/media/media.routes");
const aiRoutes = require("./modules/ai/ai.routes");
const { initSocket } = require("./socket/socketManager");

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// MIDDLEWARE CƠ BẢN
// ========================
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ========================
// ROUTES
// ========================
app.get("/", (req, res) => {
  res.json({ success: true, message: "Threads Clone API đang chạy!" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/ai", aiRoutes);

// ========================
// GLOBAL ERROR HANDLER
// ========================
app.use((err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
    });
  }

  console.error("Lỗi hệ thống:", err);
  res.status(500).json({
    success: false,
    data: null,
    message: "Lỗi máy chủ nội bộ",
  });
});

// ========================
// HTTP SERVER + SOCKET.IO
// Phải dùng http.createServer thay vì app.listen
// để Socket.io có thể gắn vào cùng port với Express
// ========================
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

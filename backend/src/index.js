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
const settingsRoutes = require("./modules/users/settings.routes");
const messageRoutes = require("./modules/messages/message.routes");
const storyRoutes = require("./modules/stories/story.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const { initSocket } = require("./socket/socketManager");

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// MIDDLEWARE CƠ BẢN
// ========================
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      /\.vercel\.app$/,
    ].filter(Boolean);

    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    if (isAllowed) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// ========================
// ROUTES
// ========================
app.get("/", (req, res) => {
  res.json({ success: true, message: "Threads Clone API đang chạy!" });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/conversations", messageRoutes);
app.use("/api/v1/stories", storyRoutes);
app.use("/api/v1/admin", adminRoutes);

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

// ========================
// CRONJOB — xóa story hết hạn mỗi giờ (phút 0)
// ========================
const cron = require("node-cron");
const { deleteExpiredStories } = require("./modules/stories/story.service");

cron.schedule("0 * * * *", async () => {
  try {
    const count = await deleteExpiredStories();
    console.log(`[Cron] Đã xóa ${count} story hết hạn`);
  } catch (err) {
    console.error("[Cron] Lỗi xóa story hết hạn:", err);
  }
});

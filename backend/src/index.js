const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./modules/auth/auth.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// MIDDLEWARE CƠ BẢN
// ========================
app.use(cors());
app.use(express.json()); // Cho phép đọc JSON từ request body

// ========================
// ROUTES
// ========================
app.get("/", (req, res) => {
  res.json({ success: true, message: "Threads Clone API đang chạy!" });
});

// Tất cả auth routes đều có prefix /api/v1/auth
app.use("/api/v1/auth", authRoutes);

// ========================
// GLOBAL ERROR HANDLER
// Phải có đúng 4 tham số (err, req, res, next) thì Express mới nhận ra đây là error handler
// ========================
app.use((err, req, res, next) => {
  // Lỗi từ AppError (throw new AppError) — lỗi có chủ ý, có statusCode rõ ràng
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
    });
  }

  // Lỗi hệ thống bất ngờ — không lộ chi tiết ra ngoài
  console.error("Lỗi hệ thống:", err);
  res.status(500).json({
    success: false,
    data: null,
    message: "Lỗi máy chủ nội bộ",
  });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

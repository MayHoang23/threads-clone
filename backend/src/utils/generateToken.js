const jwt = require("jsonwebtoken");

// Access token: hết hạn sau 15 phút, dùng để xác thực mỗi request
// Giữ key "userId" trong payload — authenticate middleware và socket auth đọc decoded.userId
const generateAccessToken = (userId, role = "USER") => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

// Refresh token: hết hạn sau 7 ngày, dùng để lấy access token mới khi hết hạn
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

module.exports = { generateAccessToken, generateRefreshToken };
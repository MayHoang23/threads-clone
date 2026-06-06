const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

// Middleware xác thực — đặt trước các route cần đăng nhập
const authenticate = async (req, res, next) => {
  try {
    // Đọc header Authorization, format phải là: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        data: null,
        message: "Không có token xác thực",
      });
    }

    // Tách lấy phần token sau chữ "Bearer "
    const token = authHeader.split(" ")[1];

    // Verify token — sẽ throw lỗi nếu token sai hoặc hết hạn
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          data: null,
          message: "Token đã hết hạn, vui lòng làm mới",
        });
      }
      return res.status(401).json({
        success: false,
        data: null,
        message: "Token không hợp lệ",
      });
    }

    // Kiểm tra user vẫn còn tồn tại trong DB (tránh trường hợp token hợp lệ nhưng user đã bị xóa)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        isPrivate: true,
        isVerified: true,
        isBanned: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: "Người dùng không tồn tại",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        data: null,
        message: "Tài khoản của bạn đã bị khóa",
      });
    }

    // Gắn user vào req — các route handler phía sau có thể dùng req.user
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };

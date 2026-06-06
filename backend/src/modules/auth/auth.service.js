const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");
const { generateAccessToken, generateRefreshToken } = require("../../utils/generateToken");

// ========================
// ĐĂNG KÝ
// ========================
const register = async ({ username, email, password, displayName }) => {
  // Kiểm tra email đã tồn tại chưa
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) throw new AppError("Email đã được sử dụng", 400);

  // Kiểm tra username đã tồn tại chưa
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) throw new AppError("Username đã được sử dụng", 400);

  // Hash password — số 10 là "salt rounds", càng cao càng an toàn nhưng càng chậm
  const hashedPassword = await bcrypt.hash(password, 10);

  // Tạo user mới trong database
  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword, displayName },
    // Chỉ trả về các trường cần thiết, KHÔNG trả về password
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatar: true,
      createdAt: true,
    },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  return { user, accessToken, refreshToken };
};

// ========================
// ĐĂNG NHẬP
// ========================
const login = async ({ email, password }) => {
  // Tìm user theo email — không dùng findUnique với select vì cần password để so sánh
  const user = await prisma.user.findUnique({ where: { email } });

  // Không tiết lộ email có tồn tại hay không để tránh bị dò email
  if (!user) throw new AppError("Email hoặc mật khẩu không đúng", 401);

  // Kiểm tra tài khoản bị ban trước khi làm gì thêm
  if (user.isBanned) throw new AppError("Tài khoản của bạn đã bị khóa", 403);

  // So sánh password người dùng nhập với password đã hash trong DB
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new AppError("Email hoặc mật khẩu không đúng", 401);

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Loại bỏ password khỏi object trả về
  const { password: _removed, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

// ========================
// LÀM MỚI ACCESS TOKEN
// ========================
const refreshToken = async (token) => {
  // Verify refresh token bằng JWT_REFRESH_SECRET (khác với JWT_SECRET của access token)
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Refresh token đã hết hạn, vui lòng đăng nhập lại", 401);
    }
    throw new AppError("Refresh token không hợp lệ", 401);
  }

  // Kiểm tra user còn tồn tại và không bị ban
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) throw new AppError("Người dùng không tồn tại", 401);
  if (user.isBanned) throw new AppError("Tài khoản của bạn đã bị khóa", 403);

  // Cấp access token mới
  const accessToken = generateAccessToken(user.id);

  return { accessToken };
};

module.exports = { register, login, refreshToken };

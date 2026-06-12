const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");
const { generateAccessToken, generateRefreshToken } = require("../../utils/generateToken");
const { sendVerificationEmail, sendResetPasswordEmail } = require("../../utils/email");

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

  // Bỏ qua xác thực email khi bật flag SKIP_EMAIL_VERIFY (dev/khi chưa cấu hình SMTP)
  if (process.env.SKIP_EMAIL_VERIFY === "true") {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    return { message: "Đăng ký thành công. Bạn có thể đăng nhập ngay." };
  }

  // Tạo token xác thực email và gửi mail
  const emailVerifyToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken },
  });

  try {
    await sendVerificationEmail(email, emailVerifyToken);
  } catch (err) {
    // Gửi mail thất bại → xóa user vừa tạo để đăng ký lại được, không bị kẹt "Email đã được sử dụng"
    await prisma.user.delete({ where: { id: user.id } });
    console.error("Lỗi gửi email xác thực:", err.message);
    throw new AppError("Không gửi được email xác thực, vui lòng thử lại sau", 500);
  }

  // Không trả về tokens — user phải xác thực email trước khi đăng nhập
  return { message: "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản." };
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

  // Chưa xác thực email → chặn đăng nhập (bỏ qua khi bật SKIP_EMAIL_VERIFY)
  if (!user.emailVerified && process.env.SKIP_EMAIL_VERIFY !== "true") {
    throw new AppError("Vui lòng xác thực email trước khi đăng nhập", 403);
  }

  const accessToken = generateAccessToken(user.id, user.role);
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
  const accessToken = generateAccessToken(user.id, user.role);

  return { accessToken };
};

// ========================
// XÁC THỰC EMAIL
// ========================
const verifyEmail = async (token) => {
  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) throw new AppError("Token không hợp lệ hoặc đã hết hạn", 400);
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null },
  });
  return { message: "Xác thực email thành công. Bạn có thể đăng nhập ngay." };
};

// ========================
// QUÊN MẬT KHẨU — GỬI EMAIL RESET
// ========================
const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Không tiết lộ email có tồn tại hay không
  if (!user) return { message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu." };

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ
  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
  });
  await sendResetPasswordEmail(email, token);
  return { message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu." };
};

// ========================
// ĐẶT LẠI MẬT KHẨU
// ========================
const resetPassword = async (token, newPassword) => {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiry: { gt: new Date() },
    },
  });
  if (!user) throw new AppError("Token không hợp lệ hoặc đã hết hạn", 400);

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    },
  });
  return { message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay." };
};

module.exports = { register, login, refreshToken, verifyEmail, forgotPassword, resetPassword };

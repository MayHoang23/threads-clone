const authService = require("./auth.service");

// ========================
// ĐĂNG KÝ
// ========================
const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validate input cơ bản
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "username, email và password là bắt buộc",
      });
    }

    const result = await authService.register({ username, email, password, displayName });

    res.status(201).json({
      success: true,
      data: result,
      message: "Đăng ký thành công",
    });
  } catch (err) {
    // Chuyển lỗi xuống error handling middleware ở index.js
    next(err);
  }
};

// ========================
// ĐĂNG NHẬP
// ========================
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "email và password là bắt buộc",
      });
    }

    const result = await authService.login({ email, password });

    res.json({
      success: true,
      data: result,
      message: "Đăng nhập thành công",
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// ĐĂNG NHẬP BẰNG GOOGLE
// ========================
const googleAuth = async (req, res, next) => {
  try {
    const { access_token: accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Thiếu Google access token",
      });
    }

    const result = await authService.googleLogin({ googleAccessToken: accessToken });

    res.json({
      success: true,
      data: result,
      message: "Đăng nhập thành công",
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// LÀM MỚI ACCESS TOKEN
// ========================
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Refresh token là bắt buộc",
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: result,
      message: "Làm mới token thành công",
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// ĐĂNG XUẤT
// ========================
const logout = (req, res) => {
  // JWT là stateless — server không lưu token, client tự xóa token ở phía mình
  res.json({
    success: true,
    data: null,
    message: "Đăng xuất thành công",
  });
};

// ========================
// XÁC THỰC EMAIL
// ========================
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, data: null, message: "Thiếu token" });
    }
    const result = await authService.verifyEmail(token);
    return res.json({ success: true, data: null, message: result.message });
  } catch (err) {
    next(err);
  }
};

// ========================
// QUÊN MẬT KHẨU
// ========================
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, data: null, message: "Thiếu email" });
    }
    const result = await authService.forgotPassword(email);
    return res.json({ success: true, data: null, message: result.message });
  } catch (err) {
    next(err);
  }
};

// ========================
// ĐẶT LẠI MẬT KHẨU
// ========================
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, data: null, message: "Thiếu token hoặc mật khẩu" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, data: null, message: "Mật khẩu tối thiểu 6 ký tự" });
    }
    const result = await authService.resetPassword(token, password);
    return res.json({ success: true, data: null, message: result.message });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, googleAuth, refreshToken, logout, verifyEmail, forgotPassword, resetPassword };

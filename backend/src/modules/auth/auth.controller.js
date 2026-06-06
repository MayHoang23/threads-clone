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

module.exports = { register, login, refreshToken, logout };

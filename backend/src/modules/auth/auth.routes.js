const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");

// POST /api/v1/auth/register — Đăng ký tài khoản mới
router.post("/register", authController.register);

// POST /api/v1/auth/login — Đăng nhập
router.post("/login", authController.login);

// POST /api/v1/auth/refresh-token — Lấy access token mới bằng refresh token
router.post("/refresh-token", authController.refreshToken);

// POST /api/v1/auth/logout — Đăng xuất
router.post("/logout", authController.logout);

// GET /api/v1/auth/verify-email?token=... — Xác thực email sau đăng ký
router.get("/verify-email", authController.verifyEmail);

// POST /api/v1/auth/forgot-password — Gửi email đặt lại mật khẩu
router.post("/forgot-password", authController.forgotPassword);

// POST /api/v1/auth/reset-password — Đặt lại mật khẩu bằng token từ email
router.post("/reset-password", authController.resetPassword);

module.exports = router;

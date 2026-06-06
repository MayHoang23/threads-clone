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

module.exports = router;

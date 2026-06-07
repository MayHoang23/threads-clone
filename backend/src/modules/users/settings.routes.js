const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const { getSettings, changePassword, updatePrivacy, updateNotifications } = require("./settings.controller");

// Tất cả settings routes đều yêu cầu đăng nhập
router.use(authenticate);

router.get("/", getSettings);
router.patch("/password", changePassword);
router.patch("/privacy", updatePrivacy);
router.patch("/notifications", updateNotifications);

module.exports = router;

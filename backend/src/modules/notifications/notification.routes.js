const express = require("express");
const router = express.Router();
const controller = require("./notification.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

// Tất cả notification routes đều yêu cầu đăng nhập
router.use(authenticate);

// Đặt route cụ thể trước route tham số để tránh conflict
router.get("/unread-count", controller.getUnreadCount);
router.patch("/read-all", controller.markAllAsRead);

router.get("/", controller.getNotifications);
router.patch("/:id/read", controller.markAsRead);
router.delete("/:id", controller.deleteNotification);

module.exports = router;

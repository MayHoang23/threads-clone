const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const ctrl = require("./message.controller");

// Tất cả routes messages đều yêu cầu đăng nhập
router.use(authenticate);

// Conversations
router.get("/", ctrl.getConversations);
router.post("/", ctrl.getOrCreate);

// Badge unread DM — đặt trước "/:id/..." để không bị nuốt bởi param route
router.get("/unread-count", ctrl.getUnreadCount);

// Messages trong conversation
router.get("/:id/messages", ctrl.getMessages);
router.post("/:id/messages", ctrl.sendMessage);
router.patch("/:id/read", ctrl.markRead);

module.exports = router;

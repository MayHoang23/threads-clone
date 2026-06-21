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

// Thao tác trên 1 tin nhắn cụ thể (recall / delete-for-me)
// Đặt trước "/:id/..." để segment literal "messages" không bị nuốt bởi param :id
router.patch("/messages/:messageId/recall", ctrl.recallMessage);
router.delete("/messages/:messageId", ctrl.deleteForMe);

// Messages trong conversation
router.get("/:id/messages", ctrl.getMessages);
router.post("/:id/messages", ctrl.sendMessage);
router.patch("/:id/read", ctrl.markRead);

module.exports = router;

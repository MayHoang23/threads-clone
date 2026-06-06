const notificationService = require("./notification.service");

// GET /api/v1/notifications
const getNotifications = async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await notificationService.getNotifications(
      req.user.id,
      cursor || null,
      limit ? Math.min(parseInt(limit), 50) : 20
    );
    res.json({ success: true, data: result, message: "" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { count }, message: "" });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, data: null, message: "Đã đánh dấu đã đọc" });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, data: result, message: "Đã đánh dấu tất cả đã đọc" });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.id);
    res.json({ success: true, data: null, message: "Đã xóa thông báo" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

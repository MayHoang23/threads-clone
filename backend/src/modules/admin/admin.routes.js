const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin } = require("../../middlewares/auth.middleware");
const adminController = require("./admin.controller");

// Tất cả route admin đều cần authenticate + requireAdmin
router.use(authenticate, requireAdmin);

// Dashboard
router.get("/stats", adminController.getDashboardStats);

// Users
router.get("/users", adminController.getUsers);
router.patch("/users/:userId/ban", adminController.toggleBanUser);
router.patch("/users/:userId/role", adminController.updateUserRole);
router.delete("/users/:userId", adminController.deleteUser);

// Posts
router.get("/posts", adminController.getPosts);
router.delete("/posts/:postId", adminController.deletePost);
router.patch("/posts/:postId/restore", adminController.restorePost);

// Reports
router.get("/reports", adminController.getReports);
router.patch("/reports/:reportId/resolve", adminController.resolveReport);

// Hashtags
router.get("/hashtags", adminController.getHashtags);
router.get("/hashtags/top", adminController.getTopHashtags);
router.delete("/hashtags/:hashtagId", adminController.deleteHashtag);

module.exports = router;

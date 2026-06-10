const express = require("express");
const router = express.Router();
const controller = require("./user.controller");
const { authenticate, optionalAuthenticate } = require("../../middlewares/auth.middleware");

// ========================
// SEARCH — đặt TRƯỚC /:username để tránh bị match nhầm
// ========================
router.get("/search", optionalAuthenticate, controller.search);

// ========================
// GỢI Ý NGƯỜI THEO DÕI — đặt TRƯỚC /:username để tránh bị match nhầm
// ========================
router.get("/suggestions", authenticate, controller.getSuggestions);

// ========================
// FRIEND REQUESTS — đặt TRƯỚC /:username để tránh bị match nhầm
// ========================
// Lấy danh sách lời mời đến
router.get("/friend-requests", authenticate, controller.getFriendRequests);

// Gửi lời mời kết bạn
router.post("/friend-request/:username", authenticate, controller.sendFriendRequest);

// Accept/reject lời mời kết bạn
router.put("/friend-request/:requestId", authenticate, controller.respondFriendRequest);

// ========================
// PROFILE — đặt TRƯỚC /:username để tránh bị match nhầm
// ========================
// Cập nhật profile của chính mình
router.put("/profile", authenticate, controller.updateProfile);

// ========================
// USER PROFILE & QUAN HỆ
// ========================
// Xem profile (optionalAuthenticate để biết isFollowing khi đã login)
router.get("/:username", optionalAuthenticate, controller.getProfile);

// Bài viết của user
router.get("/:username/posts", optionalAuthenticate, controller.getUserPosts);

// Follow / unfollow
router.post("/:username/follow", authenticate, controller.toggleFollow);

// Danh sách followers
router.get("/:username/followers", controller.getFollowers);

// Danh sách following
router.get("/:username/following", controller.getFollowing);

module.exports = router;

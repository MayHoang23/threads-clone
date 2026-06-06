const userService = require("./user.service");

// GET /api/v1/users/:username
const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id ?? null;
    const profile = await userService.getUserProfile(username, currentUserId);
    res.json({ success: true, data: profile, message: "Lấy profile thành công" });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updated = await userService.updateProfile(userId, req.body);
    res.json({ success: true, data: updated, message: "Cập nhật profile thành công" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:username/posts
const getUserPosts = async (req, res, next) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id ?? null;
    const { cursor, limit } = req.query;
    const result = await userService.getUserPosts(
      username,
      currentUserId,
      cursor || null,
      limit ? parseInt(limit) : 10
    );
    res.json({ success: true, data: result, message: "Lấy bài viết thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/users/:username/follow
const toggleFollow = async (req, res, next) => {
  try {
    const followerId = req.user.id;
    // Tìm user theo username để lấy id
    const { username } = req.params;
    const target = await require("../../utils/prisma").user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, data: null, message: "Người dùng không tồn tại" });
    }
    const result = await userService.toggleFollow(followerId, target.id);
    const msg = result.following ? "Đã follow thành công" : "Đã unfollow thành công";
    res.json({ success: true, data: result, message: msg });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:username/followers
const getFollowers = async (req, res, next) => {
  try {
    const { username } = req.params;
    const target = await require("../../utils/prisma").user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, data: null, message: "Người dùng không tồn tại" });
    }
    const followers = await userService.getFollowers(target.id);
    res.json({ success: true, data: followers, message: "Lấy danh sách followers thành công" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:username/following
const getFollowing = async (req, res, next) => {
  try {
    const { username } = req.params;
    const target = await require("../../utils/prisma").user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, data: null, message: "Người dùng không tồn tại" });
    }
    const following = await userService.getFollowing(target.id);
    res.json({ success: true, data: following, message: "Lấy danh sách following thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/users/friend-request/:username
const sendFriendRequest = async (req, res, next) => {
  try {
    const requesterId = req.user.id;
    const { username } = req.params;
    const receiver = await require("../../utils/prisma").user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!receiver) {
      return res.status(404).json({ success: false, data: null, message: "Người dùng không tồn tại" });
    }
    const request = await userService.sendFriendRequest(requesterId, receiver.id);
    res.status(201).json({ success: true, data: request, message: "Đã gửi lời mời kết bạn" });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/users/friend-request/:requestId
const respondFriendRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;
    const { action } = req.body; // "accept" hoặc "reject"
    const result = await userService.respondFriendRequest(userId, requestId, action);
    const msg = action === "accept" ? "Đã chấp nhận lời mời kết bạn" : "Đã từ chối lời mời kết bạn";
    res.json({ success: true, data: result, message: msg });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/friend-requests
const getFriendRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const requests = await userService.getFriendRequests(userId);
    res.json({ success: true, data: requests, message: "Lấy danh sách lời mời kết bạn thành công" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/search?q=keyword
const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user?.id ?? null;
    const result = await userService.search(q, currentUserId);
    res.json({ success: true, data: result, message: "Tìm kiếm thành công" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUserPosts,
  toggleFollow,
  getFollowers,
  getFollowing,
  sendFriendRequest,
  respondFriendRequest,
  getFriendRequests,
  search,
};

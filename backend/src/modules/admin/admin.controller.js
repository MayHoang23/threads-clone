const adminService = require("./admin.service");

const getDashboardStats = async (req, res, next) => {
  try {
    const data = await adminService.getDashboardStats();
    return res.json({ success: true, data, message: "Lấy thống kê thành công" });
  } catch (err) { next(err); }
};

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, banned } = req.query;
    const data = await adminService.getUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search, role, banned,
    });
    return res.json({ success: true, data, message: "Lấy danh sách users thành công" });
  } catch (err) { next(err); }
};

const toggleBanUser = async (req, res, next) => {
  try {
    const data = await adminService.toggleBanUser(req.params.userId);
    return res.json({ success: true, data, message: data.isBanned ? "Đã ban user" : "Đã unban user" });
  } catch (err) { next(err); }
};

const updateUserRole = async (req, res, next) => {
  try {
    const data = await adminService.updateUserRole(req.params.userId, req.body.role);
    return res.json({ success: true, data, message: "Đã cập nhật role" });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const data = await adminService.deleteUser(req.params.userId, req.user.id);
    return res.json({ success: true, data: null, message: data.message });
  } catch (err) { next(err); }
};

const getPosts = async (req, res, next) => {
  try {
    const { page, limit, search, hidden } = req.query;
    const data = await adminService.getPosts({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search, hidden,
    });
    return res.json({ success: true, data, message: "Lấy danh sách posts thành công" });
  } catch (err) { next(err); }
};

const deletePost = async (req, res, next) => {
  try {
    const data = await adminService.deletePost(req.params.postId);
    return res.json({ success: true, data: null, message: data.message });
  } catch (err) { next(err); }
};

const restorePost = async (req, res, next) => {
  try {
    const data = await adminService.restorePost(req.params.postId);
    return res.json({ success: true, data, message: "Đã khôi phục bài viết" });
  } catch (err) { next(err); }
};

const getReports = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const data = await adminService.getReports({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
    });
    return res.json({ success: true, data, message: "Lấy danh sách reports thành công" });
  } catch (err) { next(err); }
};

const resolveReport = async (req, res, next) => {
  try {
    const { action } = req.body;
    const data = await adminService.resolveReport(req.params.reportId, action);
    return res.json({ success: true, data, message: "Đã xử lý report" });
  } catch (err) { next(err); }
};

const getHashtags = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const data = await adminService.getHashtags({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
    return res.json({ success: true, data, message: "Lấy danh sách hashtag thành công" });
  } catch (err) { next(err); }
};

const deleteHashtag = async (req, res, next) => {
  try {
    const data = await adminService.deleteHashtag(req.params.hashtagId);
    return res.json({ success: true, data: null, message: data.message });
  } catch (err) { next(err); }
};

const getTopHashtags = async (req, res, next) => {
  try {
    const data = await adminService.getTopHashtags(10);
    return res.json({ success: true, data, message: "Lấy top hashtag thành công" });
  } catch (err) { next(err); }
};

module.exports = {
  getDashboardStats,
  getUsers, toggleBanUser, updateUserRole, deleteUser,
  getPosts, deletePost, restorePost,
  getReports, resolveReport,
  getHashtags, deleteHashtag, getTopHashtags,
};

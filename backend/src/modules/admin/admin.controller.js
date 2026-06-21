const adminService = require("./admin.service");

// Chuẩn hoá tham số phân trang từ query: chặn NaN/âm và giới hạn limit tối đa 100
const parsePagination = (query) => ({
  page: Math.max(1, parseInt(query.page) || 1),
  limit: Math.min(100, Math.max(1, parseInt(query.limit) || 20)),
});

const getDashboardStats = async (req, res, next) => {
  try {
    const data = await adminService.getDashboardStats();
    return res.json({ success: true, data, message: "Lấy thống kê thành công" });
  } catch (err) { next(err); }
};

const getUsers = async (req, res, next) => {
  try {
    const { search, role, banned } = req.query;
    const { page, limit } = parsePagination(req.query);
    const data = await adminService.getUsers({ page, limit, search, role, banned });
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
    const { search, hidden } = req.query;
    const { page, limit } = parsePagination(req.query);
    const data = await adminService.getPosts({ page, limit, search, hidden });
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
    const { status } = req.query;
    const { page, limit } = parsePagination(req.query);
    const data = await adminService.getReports({ page, limit, status });
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
    const { search } = req.query;
    const { page, limit } = parsePagination(req.query);
    const data = await adminService.getHashtags({ page, limit, search });
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

const bcrypt = require("bcryptjs");
const prisma = require("../../utils/prisma");
const AppError = require("../../utils/AppError");

// ========================
// LẤY SETTINGS HIỆN TẠI
// ========================
const getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Upsert: tạo settings mặc định nếu user chưa có
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Lấy thêm isPrivate từ User
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPrivate: true },
    });

    res.json({
      success: true,
      data: { ...settings, isPrivate: user.isPrivate },
      message: "Lấy settings thành công",
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// ĐỔI MẬT KHẨU
// ========================
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new AppError("Vui lòng điền đầy đủ thông tin", 400);
    }
    if (newPassword.length < 8) {
      throw new AppError("Mật khẩu mới phải có ít nhất 8 ký tự", 400);
    }
    if (newPassword !== confirmPassword) {
      throw new AppError("Mật khẩu xác nhận không khớp", 400);
    }

    // Lấy password hiện tại từ DB để so sánh
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError("Mật khẩu hiện tại không đúng", 400);

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Lưu ý: Refresh token dùng JWT stateless — không lưu trong DB nên không thể
    // invalidate từng token. Token cũ sẽ tự hết hạn sau 7 ngày.
    // Nếu cần invalidate ngay, cần lưu token vào DB (RefreshToken model).

    res.json({ success: true, data: null, message: "Đổi mật khẩu thành công" });
  } catch (err) {
    next(err);
  }
};

// ========================
// CẬP NHẬT QUYỀN RIÊNG TƯ
// ========================
const updatePrivacy = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { isPrivate, allowMessagesFrom } = req.body;

    const validMsgFrom = ["EVERYONE", "FOLLOWING", "NONE"];
    if (allowMessagesFrom && !validMsgFrom.includes(allowMessagesFrom)) {
      throw new AppError("Giá trị allowMessagesFrom không hợp lệ", 400);
    }

    // Cập nhật isPrivate trên User
    if (typeof isPrivate === "boolean") {
      await prisma.user.update({
        where: { id: userId },
        data: { isPrivate },
      });
    }

    // Cập nhật allowMessagesFrom trong UserSettings
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...(allowMessagesFrom && { allowMessagesFrom }) },
      update: { ...(allowMessagesFrom && { allowMessagesFrom }) },
    });

    res.json({ success: true, data: settings, message: "Cập nhật quyền riêng tư thành công" });
  } catch (err) {
    next(err);
  }
};

// ========================
// CẬP NHẬT THÔNG BÁO
// ========================
const updateNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { likeNotif, commentNotif, followNotif, emailNotif } = req.body;

    // Chỉ cập nhật các trường được gửi lên (undefined → giữ nguyên)
    const updateData = {};
    if (typeof likeNotif === "boolean") updateData.likeNotif = likeNotif;
    if (typeof commentNotif === "boolean") updateData.commentNotif = commentNotif;
    if (typeof followNotif === "boolean") updateData.followNotif = followNotif;
    if (typeof emailNotif === "boolean") updateData.emailNotif = emailNotif;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...updateData },
      update: updateData,
    });

    res.json({ success: true, data: settings, message: "Cập nhật thông báo thành công" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSettings, changePassword, updatePrivacy, updateNotifications };

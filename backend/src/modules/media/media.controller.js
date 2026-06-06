const cloudinary = require("../../config/cloudinary");
const AppError = require("../../utils/AppError");

// POST /api/v1/media/upload-image
// req.file được gắn bởi multer-storage-cloudinary sau khi upload thành công
const uploadImage = (req, res, next) => {
  try {
    if (!req.file) throw new AppError("Không có file được tải lên", 400);

    res.json({
      success: true,
      data: {
        url: req.file.path,         // Cloudinary HTTPS URL
        publicId: req.file.filename, // Cloudinary public_id (dùng để xóa sau này)
      },
      message: "Upload ảnh thành công",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/media/upload-multiple
const uploadMultiple = (req, res, next) => {
  try {
    if (!req.files?.length) throw new AppError("Không có file được tải lên", 400);

    res.json({
      success: true,
      data: req.files.map((f) => ({
        url: f.path,
        publicId: f.filename,
      })),
      message: `Upload ${req.files.length} ảnh thành công`,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/media/upload-video
const uploadVideo = (req, res, next) => {
  try {
    if (!req.file) throw new AppError("Không có file được tải lên", 400);

    res.json({
      success: true,
      data: {
        url: req.file.path,
        publicId: req.file.filename,
      },
      message: "Upload video thành công",
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/media/* (req.params[0] = publicId có thể chứa "/")
// Dùng khi: user xóa ảnh khỏi form, hoặc tạo post thất bại cần cleanup
const deleteMedia = async (req, res, next) => {
  try {
    // req.params.path từ route "/*path" (router v2), hoặc req.params[0] cho router cũ
    const publicId = req.params.path || req.params[0];
    if (!publicId?.trim()) throw new AppError("Thiếu publicId", 400);

    // Thử xóa ảnh trước, nếu không tìm thấy thì xóa video
    // Cloudinary phân biệt resource_type nên phải thử cả 2
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });

    if (result.result === "not found") {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    }

    res.json({ success: true, data: null, message: "Đã xóa file" });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadImage, uploadMultiple, uploadVideo, deleteMedia };

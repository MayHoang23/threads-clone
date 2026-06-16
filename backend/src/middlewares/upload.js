const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/AppError");

// ========================
// CLOUDINARY STORAGE CONFIGS
// ========================

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "threads-clone/images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    // Resize về max 1080px để tiết kiệm bandwidth, quality auto
    transformation: [{ width: 1080, crop: "limit", quality: "auto:good" }],
  },
});

const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "threads-clone/videos",
    resource_type: "video",
    // webm/weba/ogg/mp3/m4a: hỗ trợ thêm tin nhắn thoại (audio) ngoài video
    allowed_formats: ["mp4", "mov", "avi", "webm", "weba", "ogg", "mp3", "m4a"],
    // Giới hạn chất lượng video để tiết kiệm dung lượng
    transformation: [{ quality: "auto" }],
  },
});

// ========================
// FILE FILTERS
// ========================

const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    // Truyền AppError vào cb để createUploadMiddleware bắt được
    return cb(new AppError("Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)", 400));
  }
  cb(null, true);
};

const videoFilter = (req, file, cb) => {
  // Chấp nhận cả video và audio (tin nhắn thoại audio/webm).
  // Cloudinary lưu audio dưới resource_type "video" nên dùng chung endpoint/storage này.
  if (!file.mimetype.startsWith("video/") && !file.mimetype.startsWith("audio/")) {
    return cb(new AppError("Chỉ chấp nhận file video hoặc âm thanh", 400));
  }
  cb(null, true);
};

// ========================
// WRAPPER XỬ LÝ LỖI MULTER
// Chuyển MulterError thành AppError để global error handler hiểu được
// ========================
function wrapUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError("File quá lớn, vượt giới hạn cho phép", 400));
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return next(new AppError("Quá nhiều file, tối đa 4 ảnh cùng lúc", 400));
        }
        return next(new AppError(`Lỗi upload: ${err.message}`, 400));
      }

      // Lỗi từ fileFilter (AppError) hoặc lỗi Cloudinary
      if (err?.isOperational) return next(err);
      return next(new AppError("Không thể xử lý file, vui lòng thử lại", 400));
    });
  };
}

// ========================
// EXPORT MIDDLEWARE
// ========================

// Upload 1 ảnh, field name = "image", tối đa 5MB
exports.uploadImage = wrapUpload(
  multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single("image")
);

// Upload tối đa 4 ảnh, field name = "images"
exports.uploadMultiple = wrapUpload(
  multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  }).array("images", 4)
);

// Upload 1 video, field name = "video", tối đa 50MB
exports.uploadVideo = wrapUpload(
  multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: { fileSize: 50 * 1024 * 1024 },
  }).single("video")
);

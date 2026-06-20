const express = require("express");
const router = express.Router();
const controller = require("./media.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { uploadImage, uploadMultiple, uploadVideo } = require("../../middlewares/upload");

// GET /api/v1/media/gif-search?q=keyword&limit=20 — proxy GIPHY (giấu API key)
// Đặt TRƯỚC route wildcard "/*path" bên dưới cho rõ ràng.
router.get("/gif-search", authenticate, controller.gifSearch);

// Tất cả media routes đều yêu cầu đăng nhập
// POST /api/v1/media/upload-image
router.post("/upload-image", authenticate, uploadImage, controller.uploadImage);

// POST /api/v1/media/upload-multiple
router.post("/upload-multiple", authenticate, uploadMultiple, controller.uploadMultiple);

// POST /api/v1/media/upload-video
router.post("/upload-video", authenticate, uploadVideo, controller.uploadVideo);

// DELETE /api/v1/media/<publicId> — publicId có thể chứa "/" (vd: threads-clone/images/abc)
// Router 2.x dùng "*path" thay vì "/*" cũ
router.delete("/*path", authenticate, controller.deleteMedia);

module.exports = router;

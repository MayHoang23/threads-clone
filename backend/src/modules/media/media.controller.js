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

// ========================
// GIF SEARCH — proxy GIPHY API (giấu API key khỏi frontend)
// ========================
// Cache kết quả trending (query rỗng) 10 phút để giảm số lần gọi GIPHY.
const TRENDING_TTL = 10 * 60 * 1000; // 10 phút
const trendingCache = new Map(); // key: limit → { data, expiresAt }

// Chuẩn hóa 1 kết quả GIPHY → { id, url, previewUrl, description }
const mapGiphyResult = (g) => {
  const imgs = g.images || {};
  const url = imgs.original?.url || imgs.fixed_height?.url || null; // GIF full để hiển thị/lưu
  // preview nhẹ cho lưới: ưu tiên fixed_height_small, fallback preview_gif rồi original
  const previewUrl =
    imgs.fixed_height_small?.url || imgs.preview_gif?.url || url || null;
  return { id: g.id, url, previewUrl, description: g.title || "" };
};

const gifSearch = async (req, res) => {
  const q = (req.query.q || "").trim();
  // limit: clamp 1..50, mặc định 20
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    // Chưa cấu hình key → trả mảng rỗng, không làm vỡ UI
    return res.json({ success: false, data: [], message: "Chưa cấu hình GIPHY_API_KEY" });
  }

  const isTrending = q === "";

  // Hit cache trending nếu còn hạn
  if (isTrending) {
    const cached = trendingCache.get(limit);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, data: cached.data });
    }
  }

  // Timeout 5s bằng AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const base = isTrending
      ? "https://api.giphy.com/v1/gifs/trending"
      : "https://api.giphy.com/v1/gifs/search";
    const params = new URLSearchParams({
      api_key: apiKey,
      limit: String(limit),
      ...(isTrending ? {} : { q, lang: "vi" }),
    });

    const resp = await fetch(`${base}?${params}`, { signal: controller.signal });
    if (!resp.ok) throw new Error(`GIPHY trả về ${resp.status}`);

    const json = await resp.json();
    const data = (json.data || []).map(mapGiphyResult).filter((g) => g.url);

    if (isTrending) {
      trendingCache.set(limit, { data, expiresAt: Date.now() + TRENDING_TTL });
    }

    res.json({ success: true, data });
  } catch (err) {
    // Lỗi (timeout/mạng/GIPHY) → trả mảng rỗng kèm success: false
    res.json({ success: false, data: [], message: "Không tải được GIF, vui lòng thử lại" });
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { uploadImage, uploadMultiple, uploadVideo, deleteMedia, gifSearch };

const ogs = require("open-graph-scraper");

// ========================
// LINK PREVIEW (Open Graph)
// ========================
// Fetch OG tags (title/description/image/site_name) từ 1 URL.
// - Timeout 5 giây (AbortController) → nếu chậm/treo thì bỏ
// - Cache kết quả 1 giờ trong memory (Map, key = url) để tránh fetch lại

const CACHE_TTL = 60 * 60 * 1000; // 1 giờ
const FETCH_TIMEOUT = 5000; // 5 giây
const cache = new Map(); // url -> { data, expiresAt }

// Lấy URL ảnh đầu tiên từ field ogImage/twitterImage (có thể là array hoặc object)
function pickImage(field) {
  if (!field) return null;
  if (Array.isArray(field)) return field[0]?.url || null;
  return field.url || null;
}

const getLinkPreview = async (url) => {
  // 1. Trả từ cache nếu còn hạn
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 2. Fetch OG tags với timeout 5s
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const { error, result } = await ogs({
      url,
      fetchOptions: {
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; ThreadsCloneBot/1.0; +link-preview)",
        },
      },
    });

    if (error || !result?.success) return null;

    const preview = {
      url: result.ogUrl || url,
      title: result.ogTitle || result.twitterTitle || null,
      description: result.ogDescription || result.twitterDescription || null,
      image: pickImage(result.ogImage) || pickImage(result.twitterImage),
      siteName: result.ogSiteName || null,
    };

    // Chỉ cache khi có ít nhất title hoặc image (preview có ý nghĩa)
    if (preview.title || preview.image) {
      cache.set(url, { data: preview, expiresAt: Date.now() + CACHE_TTL });
      return preview;
    }
    return null;
  } catch (err) {
    // Timeout / URL lỗi / không fetch được → coi như không có preview
    return null;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { getLinkPreview };

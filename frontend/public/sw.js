const CACHE_NAME = "threads-v1";

// Static assets cần cache khi install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// ========================
// INSTALL — cache static assets
// ========================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // skipWaiting để SW mới active ngay, không chờ tab cũ đóng
      self.skipWaiting();
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Bỏ qua lỗi nếu một số asset không cache được
      });
    })
  );
});

// ========================
// ACTIVATE — xóa cache cũ
// ========================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ========================
// FETCH — chiến lược cache
// ========================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Chỉ xử lý GET requests
  if (request.method !== "GET") return;

  // API calls: Network-first — luôn lấy dữ liệu mới, fallback cache nếu offline
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Clone response trước khi cache (response chỉ đọc được 1 lần)
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static files (JS, CSS, fonts, images): Cache-first — nhanh hơn, ít request hơn
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((res) => {
        // Chỉ cache response hợp lệ (tránh cache lỗi)
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      });
    })
  );
});

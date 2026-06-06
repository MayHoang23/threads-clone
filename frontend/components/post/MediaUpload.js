"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const MAX_IMAGES = 4;
const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 50;

// Upload 1 file với XMLHttpRequest để theo dõi tiến trình thực sự
function uploadXHR(file, endpoint, fieldName, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append(fieldName, file);

    const xhr = new XMLHttpRequest();

    // Sự kiện progress — chỉ có với XHR, không có với fetch
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        // Dừng ở 95% — nhảy lên 100% khi nhận response thành công
        onProgress(Math.min(Math.round((e.loaded / e.total) * 95), 95));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success) resolve(data.data);
        else reject(new Error(data.message || "Upload thất bại"));
      } catch {
        reject(new Error("Phản hồi không hợp lệ từ server"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Lỗi kết nối mạng")));
    xhr.addEventListener("abort", () => reject(new Error("Upload bị hủy")));

    xhr.open("POST", `${API_BASE}${endpoint}`);
    xhr.setRequestHeader("Authorization", `Bearer ${getAccessToken()}`);
    xhr.send(formData);
  });
}

// Xóa 1 file khỏi Cloudinary sau upload (cleanup khi user bỏ ảnh)
async function deleteFromCloudinary(publicId) {
  try {
    await fetch(`${API_BASE}/media/${publicId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
  } catch {
    // Bỏ qua lỗi delete — file sẽ bị dọn dẹp theo chu kỳ
  }
}

export default function MediaUpload({ onMediaChange, disabled }) {
  // items: [{ id, file, previewUrl, url, publicId, type, status, progress, error }]
  // status: "uploading" | "done" | "error"
  const [items, setItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0); // Đếm drag enter/leave để tránh flicker

  // Loại media hiện tại (ảnh hoặc video) — không cho trộn lẫn
  const currentType = items[0]?.type ?? null; // "IMAGE" | "VIDEO" | null
  const isUploading = items.some((i) => i.status === "uploading");
  const hasError = items.some((i) => i.status === "error");

  // Thông báo cho parent mỗi khi items thay đổi
  useEffect(() => {
    const ready = items
      .filter((i) => i.status === "done")
      .map((i) => ({ url: i.url, publicId: i.publicId, type: i.type }));
    onMediaChange?.(ready, isUploading);
  }, [items]);

  // Cleanup tất cả previewUrl khi component unmount
  useEffect(() => {
    return () => {
      items.forEach((i) => {
        if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
      });
    };
  }, []);

  const uploadItem = useCallback(async (itemId, file, type) => {
    const endpoint = type === "VIDEO" ? "/media/upload-video" : "/media/upload-image";
    const fieldName = type === "VIDEO" ? "video" : "image";

    try {
      const result = await uploadXHR(file, endpoint, fieldName, (progress) => {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, progress } : i))
        );
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, url: result.url, publicId: result.publicId, status: "done", progress: 100 }
            : i
        )
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, status: "error", error: err.message, progress: 0 } : i
        )
      );
    }
  }, []);

  const validateFiles = (files) => {
    setGlobalError("");

    if (!files.length) return null;

    const firstMime = files[0].type;
    const incomingType = firstMime.startsWith("video/") ? "VIDEO" : "IMAGE";

    // Không cho trộn ảnh và video
    if (currentType && currentType !== incomingType) {
      setGlobalError("Không thể trộn ảnh và video cùng lúc");
      return null;
    }

    // Chỉ 1 video tại 1 thời điểm
    if (incomingType === "VIDEO") {
      if (items.length > 0) {
        setGlobalError("Chỉ có thể upload 1 video");
        return null;
      }
      if (files.length > 1) {
        setGlobalError("Chỉ chọn 1 video");
        return null;
      }
      const file = files[0];
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        setGlobalError(`Video tối đa ${MAX_VIDEO_MB}MB`);
        return null;
      }
    }

    if (incomingType === "IMAGE") {
      const currentCount = items.filter((i) => i.type === "IMAGE").length;
      if (currentCount + files.length > MAX_IMAGES) {
        setGlobalError(`Tối đa ${MAX_IMAGES} ảnh`);
        return null;
      }
      for (const f of files) {
        if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
          setGlobalError(`Mỗi ảnh tối đa ${MAX_IMAGE_MB}MB`);
          return null;
        }
      }
    }

    return incomingType;
  };

  const processFiles = (rawFiles) => {
    const files = Array.from(rawFiles).filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/")
    );

    const incomingType = validateFiles(files);
    if (!incomingType) return;

    const newItems = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      url: null,
      publicId: null,
      type: incomingType,
      status: "uploading",
      progress: 0,
      error: null,
    }));

    setItems((prev) => [...prev, ...newItems]);
    // Bắt đầu upload ngay — không chờ user nhấn Đăng
    newItems.forEach((item) => uploadItem(item.id, item.file, item.type));
  };

  const removeItem = (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Giải phóng bộ nhớ object URL
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);

    // Xóa file đã upload trên Cloudinary nếu có
    if (item.publicId) deleteFromCloudinary(item.publicId);

    setItems((prev) => prev.filter((i) => i.id !== id));
    setGlobalError("");
  };

  const retryUpload = (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "uploading", progress: 0, error: null } : i))
    );
    uploadItem(id, item.file, item.type);
  };

  // ========================
  // DRAG & DROP HANDLERS
  // ========================
  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (!disabled) processFiles(e.dataTransfer.files);
  };

  const canAddMore =
    !disabled &&
    ((currentType === "IMAGE" && items.length < MAX_IMAGES) || currentType === null);

  return (
    <div className="mt-2">
      {/* ===== PREVIEW ITEMS ===== */}
      {items.length > 0 && (
        <div
          className={`grid gap-1.5 mb-2 rounded-2xl overflow-hidden ${
            items.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative bg-gray-100 overflow-hidden ${
                items.length === 1
                  ? item.type === "VIDEO"
                    ? "aspect-video"
                    : "aspect-[4/3]"
                  : "aspect-square"
              }`}
            >
              {/* Preview */}
              {item.type === "VIDEO" ? (
                <video src={item.previewUrl} className="w-full h-full object-cover" />
              ) : (
                <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
              )}

              {/* Overlay khi đang upload */}
              {item.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {/* Progress bar */}
                  <div className="w-3/4 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-medium">{item.progress}%</span>
                </div>
              )}

              {/* Overlay khi lỗi */}
              {item.status === "error" && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 p-2">
                  <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-white text-xs text-center leading-tight">{item.error}</p>
                  <button
                    onClick={() => retryUpload(item.id)}
                    className="text-xs text-white bg-white/20 px-2 py-1 rounded-full hover:bg-white/30 transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Nút xóa */}
              <button
                onClick={() => removeItem(item.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors z-10"
              >
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Badge done */}
              {item.status === "done" && (
                <div className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {/* Ô thêm ảnh tiếp theo — chỉ hiện với ảnh, tối đa 4 */}
          {canAddMore && items.length > 0 && currentType === "IMAGE" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square bg-gray-100 hover:bg-gray-150 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-xs text-gray-400">{MAX_IMAGES - items.length} còn lại</span>
            </button>
          )}
        </div>
      )}

      {/* ===== DRAG & DROP ZONE — chỉ hiện khi chưa có file ===== */}
      {items.length === 0 && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl py-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
            isDragging
              ? "border-black bg-gray-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">
              {isDragging ? "Thả file vào đây" : "Kéo thả hoặc click để chọn"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Tối đa {MAX_IMAGES} ảnh ({MAX_IMAGE_MB}MB/ảnh) hoặc 1 video ({MAX_VIDEO_MB}MB)
            </p>
          </div>
        </div>
      )}

      {/* Thông báo lỗi chung */}
      {globalError && (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {globalError}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/avi,video/webm"
        multiple={currentType !== "VIDEO"}
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = ""; // Reset để chọn lại file cũ được
        }}
      />
    </div>
  );
}

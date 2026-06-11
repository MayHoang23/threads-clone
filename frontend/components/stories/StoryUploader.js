"use client";

import { useState, useRef, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 50;

// Màu nền cho story văn bản
const BG_COLORS = ["#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560", "#f5a623"];

// Upload file lên Cloudinary qua media API — dùng FormData nên không đi qua fetchAPI (JSON)
async function uploadMedia(file) {
  const isVideo = file.type.startsWith("video");
  const endpoint = isVideo ? "/media/upload-video" : "/media/upload-image";
  const fieldName = isVideo ? "video" : "image";

  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload thất bại");
  return data.data; // { url, publicId, ... }
}

// Modal đăng story mới
export default function StoryUploader({ onClose, onUploaded }) {
  const [mode, setMode] = useState("media"); // "media" | "text"
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const isVideo = file?.type.startsWith("video");

  // Khóa scroll body khi modal mở
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Giải phóng object URL cũ mỗi khi đổi file / unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSelectFile = (e) => {
    const selected = e.target.files?.[0];
    e.target.value = ""; // Reset để chọn lại file cũ được
    if (!selected) return;

    setError("");
    const video = selected.type.startsWith("video");
    const maxMB = video ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (selected.size > maxMB * 1024 * 1024) {
      setError(video ? `Video tối đa ${MAX_VIDEO_MB}MB` : `Ảnh tối đa ${MAX_IMAGE_MB}MB`);
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Story văn bản — không upload media
    if (mode === "text") {
      if (!textContent.trim()) {
        setError("Vui lòng nhập nội dung");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await fetchAPI("/stories", {
          method: "POST",
          body: JSON.stringify({
            mediaUrl: null,
            mediaType: "text",
            caption: textContent.trim(),
            bgColor,
          }),
        });
        if (data?.success) {
          onUploaded?.(data.data);
          onClose?.();
        }
      } catch (err) {
        setError(err.message || "Đăng story thất bại");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Story ảnh/video
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const media = await uploadMedia(file);
      const data = await fetchAPI("/stories", {
        method: "POST",
        body: JSON.stringify({
          mediaUrl: media.url,
          mediaType: isVideo ? "video" : "image",
          caption: caption.trim() || null,
        }),
      });

      if (data?.success) {
        onUploaded?.(data.data);
        onClose?.();
      }
    } catch (err) {
      setError(err.message || "Đăng story thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !loading && onClose?.()}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">Tạo tin</h2>
          <button
            onClick={() => !loading && onClose?.()}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs chọn chế độ */}
        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => {
              setMode("media");
              setError("");
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              mode === "media"
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Ảnh/Video
          </button>
          <button
            onClick={() => {
              setMode("text");
              setError("");
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              mode === "text"
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Văn bản
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {mode === "text" ? (
            <>
              {/* Preview story text — textarea trong suốt nằm trên nền màu, vừa nhập vừa preview */}
              <div
                style={{ background: bgColor }}
                className="rounded-2xl overflow-hidden aspect-[9/16] max-h-[50vh] min-h-[300px] mx-auto flex items-center justify-center"
              >
                <textarea
                  value={textContent}
                  onChange={(e) => {
                    setTextContent(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Nhập nội dung tin..."
                  maxLength={500}
                  className="w-full max-h-full px-6 py-4 bg-transparent text-white text-2xl font-medium text-center placeholder-white/50 outline-none resize-none"
                  rows={5}
                />
              </div>

              {/* Picker màu nền */}
              <div className="flex items-center justify-center gap-2.5 mt-3">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBgColor(color)}
                    style={{ background: color }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      bgColor === color
                        ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-900 scale-110"
                        : "hover:scale-110"
                    }`}
                    aria-label={`Màu nền ${color}`}
                  />
                ))}
              </div>
            </>
          ) : !file ? (
            // Chưa chọn file → ô chọn ảnh/video
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-12 flex flex-col items-center gap-2 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Chọn ảnh hoặc video</p>
              <p className="text-xs text-gray-400">
                Ảnh tối đa {MAX_IMAGE_MB}MB, video tối đa {MAX_VIDEO_MB}MB
              </p>
            </button>
          ) : (
            // Đã chọn file → preview
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[50vh] mx-auto">
              {isVideo ? (
                <video src={previewUrl} controls className="w-full h-full object-contain" />
              ) : (
                <img src={previewUrl} alt="" className="w-full h-full object-contain" />
              )}
              {/* Nút đổi file */}
              <button
                onClick={() => !loading && fileInputRef.current?.click()}
                className="absolute top-2 right-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs rounded-full transition-colors"
              >
                Đổi file
              </button>
            </div>
          )}

          {/* Caption — chỉ cho story ảnh/video (story text dùng textarea làm nội dung chính) */}
          {mode === "media" && (
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Thêm chú thích..."
              maxLength={200}
              className="w-full mt-3 px-3 py-2 text-sm rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-violet-400"
            />
          )}

          {/* Lỗi */}
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={(mode === "media" ? !file : !textContent.trim()) || loading}
            className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-gray-900/30 dark:border-t-gray-900 rounded-full animate-spin" />
            )}
            {loading ? "Đang đăng..." : "Đăng"}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleSelectFile}
        />
      </div>
    </div>
  );
}

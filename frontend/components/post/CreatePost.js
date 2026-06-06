"use client";

import { useState, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import MediaUpload from "./MediaUpload";

const PRIVACY_OPTIONS = [
  { value: "PUBLIC", label: "🌍 Mọi người" },
  { value: "FRIENDS", label: "👥 Bạn bè" },
  { value: "PRIVATE", label: "🔒 Chỉ mình tôi" },
];

function Avatar({ user }) {
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-sm select-none">
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Xóa file đã upload khi tạo post thất bại
async function cleanupMedia(mediaItems) {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (!token) return;
  await Promise.allSettled(
    mediaItems
      .filter((m) => m.publicId)
      .map((m) =>
        fetch(`${API_BASE}/media/${m.publicId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      )
  );
}

export default function CreatePost({ currentUser, onPostCreated }) {
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("PUBLIC");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  // uploadedMedia: [{ url, publicId, type }] — nhận từ MediaUpload
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef(null);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  };

  // Callback từ MediaUpload khi có thay đổi
  const handleMediaChange = (media, uploading) => {
    setUploadedMedia(media);
    setIsUploading(uploading);
    // Nếu user xóa hết ảnh → ẩn khu vực media
    if (media.length === 0 && !uploading) {
      // Giữ showMedia = true để user có thể thêm tiếp
    }
  };

  const handleSubmit = async () => {
    const hasContent = content.trim();
    const hasMedia = uploadedMedia.length > 0;
    if ((!hasContent && !hasMedia) || loading || isUploading) return;

    setLoading(true);
    try {
      const data = await fetchAPI("/posts", {
        method: "POST",
        body: JSON.stringify({
          content: content.trim() || null,
          privacy,
          // Truyền mediaUrls với format [{url, type}] mà post.service đang expect
          mediaUrls: uploadedMedia.map(({ url, type }) => ({ url, type })),
        }),
      });

      if (data?.success) {
        // Reset form
        setContent("");
        setUploadedMedia([]);
        setShowMedia(false);
        setFocused(false);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        onPostCreated?.(data.data);
      } else {
        // Tạo post thất bại → xóa file đã upload khỏi Cloudinary
        await cleanupMedia(uploadedMedia);
      }
    } catch {
      // Lỗi mạng → cleanup
      await cleanupMedia(uploadedMedia);
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = () => {
    if (!content.trim() && !showMedia) setFocused(false);
  };

  const charsLeft = 500 - content.length;
  const hasMedia = uploadedMedia.length > 0 || isUploading;
  const canPost =
    (content.trim() || hasMedia) && charsLeft >= 0 && !isUploading && !loading;

  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Avatar user={currentUser} />
          {(focused || showMedia) && (
            <div className="w-0.5 bg-gray-200 flex-1 mt-2 min-h-[16px] rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {currentUser?.username ?? "..."}
          </p>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            placeholder="Có gì mới không?"
            rows={focused || showMedia ? 3 : 1}
            className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none resize-none bg-transparent leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
          />

          {/* Khu vực media upload — hiện khi nhấn icon ảnh */}
          {showMedia && (
            <MediaUpload
              onMediaChange={handleMediaChange}
              disabled={loading}
            />
          )}

          {/* Footer toolbar */}
          {(focused || showMedia) && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 -ml-1">
                {/* Nút thêm ảnh/video */}
                <button
                  type="button"
                  onClick={() => setShowMedia((v) => !v)}
                  title="Thêm ảnh / video"
                  className={`p-1.5 rounded-full transition-colors ${
                    showMedia
                      ? "bg-gray-100 text-black"
                      : "text-gray-400 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>

                {/* Indicator đang upload */}
                {isUploading && (
                  <span className="text-xs text-gray-400 ml-1 flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Đang tải...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="text-xs text-gray-400 bg-transparent outline-none cursor-pointer hover:text-gray-600 transition-colors"
                >
                  {PRIVACY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <span className={`text-xs ${charsLeft < 20 ? "text-red-500" : "text-gray-400"}`}>
                  {charsLeft}
                </span>

                <button
                  onClick={handleSubmit}
                  disabled={!canPost}
                  className="px-4 py-1.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Đang đăng
                    </span>
                  ) : (
                    "Đăng"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

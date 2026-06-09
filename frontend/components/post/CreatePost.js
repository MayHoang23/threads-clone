"use client";

import { useState, useRef, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import MediaUpload from "./MediaUpload";
import CaptionGenerator from "@/components/ai/CaptionGenerator";
import HashtagSuggester from "@/components/ai/HashtagSuggester";

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

// modal=true  → hidden until 'open-create-post' event fires, then shows as overlay
// modal=false → always renders inline (newsfeed), no event listener
export default function CreatePost({ currentUser, onPostCreated, modal = false }) {
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("PUBLIC");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [showHashtag, setShowHashtag] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [moderationWarning, setModerationWarning] = useState("");
  const textareaRef = useRef(null);

  // Only the modal-mode instance (in Navbar) listens for the event
  useEffect(() => {
    if (!modal) return;
    const handler = () => setShowModal(true);
    window.addEventListener("open-create-post", handler);
    return () => window.removeEventListener("open-create-post", handler);
  }, [modal]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (showModal && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [showModal]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [showModal]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    if (moderationWarning) setModerationWarning("");
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  };

  const handleMediaChange = (media, uploading) => {
    setUploadedMedia(media);
    setIsUploading(uploading);
  };

  const handleSelectCaption = (caption) => {
    setContent(caption);
    if (moderationWarning) setModerationWarning("");
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
      ta.focus();
    }
  };

  const handleAddHashtag = (hashtagText) => {
    setContent((prev) => {
      const trimmed = prev.trimEnd();
      if (trimmed.includes(hashtagText)) return prev;
      return trimmed ? `${trimmed} ${hashtagText}` : hashtagText;
    });
    const ta = textareaRef.current;
    if (ta) {
      setTimeout(() => {
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
      }, 0);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setContent("");
    setUploadedMedia([]);
    setShowMedia(false);
    setShowCaption(false);
    setShowHashtag(false);
    setFocused(false);
    setModerationWarning("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleSubmit = async () => {
    const hasContent = content.trim();
    const hasMedia = uploadedMedia.length > 0;
    if ((!hasContent && !hasMedia) || loading || isUploading || moderationWarning) return;

    setLoading(true);
    setModerationWarning("");
    try {
      const data = await fetchAPI("/posts", {
        method: "POST",
        body: JSON.stringify({
          content: content.trim() || null,
          privacy,
          mediaUrls: uploadedMedia.map(({ url, type }) => ({ url, type })),
        }),
      });

      if (data?.success) {
        setContent("");
        setUploadedMedia([]);
        setShowMedia(false);
        setShowCaption(false);
        setShowHashtag(false);
        setFocused(false);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        window.dispatchEvent(new CustomEvent("post-created", { detail: data.data }));
        onPostCreated?.(data.data);
        if (showModal) setShowModal(false);
      } else {
        await cleanupMedia(uploadedMedia);
      }
    } catch (err) {
      if (err.status === 422) {
        const msg = err.message || "Nội dung vi phạm chính sách cộng đồng";
        setModerationWarning(msg);
      } else {
        await cleanupMedia(uploadedMedia);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!content.trim() && !showMedia && !showCaption && !showHashtag) setFocused(false);
    }, 200);
  };

  const charsLeft = 500 - content.length;
  const hasMedia = uploadedMedia.length > 0 || isUploading;
  const canPost =
    (content.trim() || hasMedia) &&
    charsLeft >= 0 &&
    !isUploading &&
    !loading &&
    !moderationWarning;

  // Always expanded inside modal
  const isExpanded = focused || showMedia || showCaption || showHashtag || showModal;

  const formInner = (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <Avatar user={currentUser} />
        {isExpanded && (
          <div className="w-0.5 bg-gray-200 flex-1 mt-2 min-h-[16px] rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {currentUser?.username ?? "..."}
        </p>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder="Có gì mới không?"
          rows={isExpanded ? 3 : 1}
          className="w-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none bg-transparent leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />

        {moderationWarning && (
          <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <span className="text-red-500 text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-red-600 leading-relaxed">{moderationWarning}</p>
          </div>
        )}

        {showCaption && (
          <CaptionGenerator onSelectCaption={handleSelectCaption} />
        )}

        {showHashtag && (
          <HashtagSuggester content={content} onAddHashtag={handleAddHashtag} />
        )}

        {showMedia && (
          <MediaUpload
            onMediaChange={handleMediaChange}
            disabled={loading}
          />
        )}

        {isExpanded && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1 -ml-1">
              <button
                type="button"
                onClick={() => setShowMedia((v) => !v)}
                title="Thêm ảnh / video"
                className={`p-1.5 rounded-full transition-colors ${
                  showMedia
                    ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
                    : "text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setShowCaption((v) => !v)}
                title="Tạo caption bằng AI"
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  showCaption
                    ? "bg-violet-100 text-violet-700"
                    : "text-gray-400 hover:text-violet-600 hover:bg-violet-50"
                }`}
              >
                ✨ AI
              </button>

              <button
                type="button"
                onClick={() => setShowHashtag((v) => !v)}
                title="Gợi ý hashtag bằng AI"
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  showHashtag
                    ? "bg-violet-100 text-violet-700"
                    : "text-gray-400 hover:text-violet-600 hover:bg-violet-50"
                }`}
              >
                # Tag
              </button>

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
                className="text-xs text-gray-400 bg-transparent outline-none cursor-pointer hover:text-gray-600 transition-colors dark:hover:text-gray-300"
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
                className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
  );

  // modal-mode but not triggered yet: render nothing
  if (modal && !showModal) return null;

  // Modal overlay (triggered from Navbar button)
  if (showModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
      >
        <div className="bg-white dark:bg-gray-950 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Tạo bài viết</h2>
            <button
              onClick={closeModal}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="px-4 py-4">
            {formInner}
          </div>
        </div>
      </div>
    );
  }

  // Inline render (newsfeed)
  return (
    <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
      {formInner}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import MediaUpload from "./MediaUpload";
import CaptionGenerator from "@/components/ai/CaptionGenerator";
import HashtagSuggester from "@/components/ai/HashtagSuggester";
import MentionTextarea from "@/components/ui/MentionTextarea";
import LinkPreviewCard, { LinkPreviewSkeleton } from "./LinkPreviewCard";
import GifPicker from "@/components/ui/GifPicker";
import { useLanguage } from "@/contexts/LanguageContext";

// Bắt URL đầu tiên trong nội dung
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

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
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("PUBLIC");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [showHashtag, setShowHashtag] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGif, setSelectedGif] = useState(null); // URL GIF Tenor (media type GIF)
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [moderationWarning, setModerationWarning] = useState("");
  const [linkPreview, setLinkPreview] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const textareaRef = useRef(null);
  const linkDebounceRef = useRef(null);
  const dismissedUrlsRef = useRef(new Set()); // URL user đã chủ động bỏ preview
  const triedUrlsRef = useRef(new Set()); // URL đã fetch (dù thành công hay thất bại) → không fetch lại

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

  // Detect URL trong content → debounce 800ms → fetch Open Graph preview
  useEffect(() => {
    const matches = content.match(URL_REGEX);
    const url = matches?.[0];

    // Không có URL → xóa preview, hủy debounce đang chờ
    if (!url) {
      if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
      setLinkLoading(false);
      setLinkPreview(null);
      return;
    }

    // Bỏ qua nếu: user đã dismiss, đã fetch URL này rồi, hoặc đang hiện preview của đúng URL
    if (dismissedUrlsRef.current.has(url)) return;
    if (triedUrlsRef.current.has(url)) return;
    if (linkPreview?._sourceUrl === url) return;

    if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    linkDebounceRef.current = setTimeout(async () => {
      triedUrlsRef.current.add(url); // đánh dấu đã fetch → không lặp lại
      setLinkLoading(true);
      try {
        const res = await fetchAPI(
          `/posts/link-preview?url=${encodeURIComponent(url)}`
        );
        // Chỉ áp dụng nếu URL vẫn còn trong nội dung và chưa bị dismiss
        if (res?.success && res.data && !dismissedUrlsRef.current.has(url)) {
          setLinkPreview({ ...res.data, _sourceUrl: url });
        } else {
          setLinkPreview(null);
        }
      } catch {
        setLinkPreview(null);
      } finally {
        setLinkLoading(false);
      }
    }, 800);

    return () => {
      if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    };
  }, [content, linkPreview?._sourceUrl]);

  const handleDismissPreview = () => {
    if (linkPreview?._sourceUrl) dismissedUrlsRef.current.add(linkPreview._sourceUrl);
    if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    setLinkLoading(false);
    setLinkPreview(null);
  };

  // MentionTextarea tự co giãn chiều cao + xử lý @mention; chỉ cần cập nhật content
  const handleContentChange = (value) => {
    setContent(value);
    if (moderationWarning) setModerationWarning("");
  };

  const handleMediaChange = (media, uploading) => {
    setUploadedMedia(media);
    setIsUploading(uploading);
  };

  const handleSelectCaption = (caption) => {
    setContent(caption);
    if (moderationWarning) setModerationWarning("");
    textareaRef.current?.focus();
  };

  const handleAddHashtag = (hashtagText) => {
    setContent((prev) => {
      const trimmed = prev.trimEnd();
      if (trimmed.includes(hashtagText)) return prev;
      return trimmed ? `${trimmed} ${hashtagText}` : hashtagText;
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setContent("");
    setUploadedMedia([]);
    setSelectedGif(null);
    setShowGifPicker(false);
    setShowMedia(false);
    setShowCaption(false);
    setShowHashtag(false);
    setFocused(false);
    setModerationWarning("");
    setLinkPreview(null);
    setLinkLoading(false);
    dismissedUrlsRef.current = new Set();
    triedUrlsRef.current = new Set();
  };

  const handleSubmit = async () => {
    const hasContent = content.trim();
    const hasMedia = uploadedMedia.length > 0 || selectedGif;
    if ((!hasContent && !hasMedia) || loading || isUploading || moderationWarning) return;

    setLoading(true);
    setModerationWarning("");
    try {
      const body = {
        content: content.trim() || null,
        privacy,
        mediaUrls: [
          ...uploadedMedia.map(({ url, type }) => ({ url, type })),
          // GIF Tenor: URL ngoài (không upload Cloudinary), đánh dấu type GIF
          ...(selectedGif ? [{ url: selectedGif, type: "GIF" }] : []),
        ],
      };
      // Kèm link preview nếu có
      if (linkPreview) {
        body.linkUrl = linkPreview._sourceUrl || linkPreview.url;
        body.linkTitle = linkPreview.title || null;
        body.linkDescription = linkPreview.description || null;
        body.linkImage = linkPreview.image || null;
        body.linkSiteName = linkPreview.siteName || null;
      }

      const data = await fetchAPI("/posts", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (data?.success) {
        setContent("");
        setUploadedMedia([]);
        setSelectedGif(null);
        setShowGifPicker(false);
        setShowMedia(false);
        setShowCaption(false);
        setShowHashtag(false);
        setFocused(false);
        setLinkPreview(null);
        setLinkLoading(false);
        dismissedUrlsRef.current = new Set();
        triedUrlsRef.current = new Set();
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
  const hasMedia = uploadedMedia.length > 0 || isUploading || !!selectedGif;
  const canPost =
    (content.trim() || hasMedia) &&
    charsLeft >= 0 &&
    !isUploading &&
    !loading &&
    !moderationWarning;

  // Always expanded inside modal
  const isExpanded = focused || showMedia || showCaption || showHashtag || showGifPicker || !!selectedGif || showModal;

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

        <MentionTextarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={t("post.placeholder")}
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

        {/* Link preview (Open Graph) */}
        {linkLoading && (
          <div className="mt-2">
            <LinkPreviewSkeleton />
          </div>
        )}
        {!linkLoading && linkPreview && (
          <div className="mt-2">
            <LinkPreviewCard
              url={linkPreview._sourceUrl || linkPreview.url}
              title={linkPreview.title}
              description={linkPreview.description}
              image={linkPreview.image}
              siteName={linkPreview.siteName}
              onDismiss={handleDismissPreview}
            />
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

        {/* Preview GIF đã chọn (Tenor) — render như ảnh, có badge GIF + nút bỏ */}
        {selectedGif && (
          <div className="mt-2 relative inline-block rounded-2xl overflow-hidden">
            <img src={selectedGif} alt="GIF" className="max-h-60 max-w-full object-cover" />
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded">
              GIF
            </span>
            <button
              type="button"
              onClick={() => setSelectedGif(null)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
              aria-label="Bỏ GIF"
            >
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
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

              {/* Nút GIF + popup GifPicker (mở lên trên để tránh tràn màn hình) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGifPicker((v) => !v)}
                  title="Thêm GIF"
                  className={`px-2 py-1 rounded-full text-xs font-bold border transition-colors ${
                    showGifPicker || selectedGif
                      ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                      : "text-gray-400 border-gray-300 dark:border-gray-700 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  GIF
                </button>
                {showGifPicker && (
                  <GifPicker
                    className="left-0 bottom-full mb-2"
                    onSelect={(url) => setSelectedGif(url)}
                    onClose={() => setShowGifPicker(false)}
                  />
                )}
              </div>

              {isUploading && (
                <span className="text-xs text-gray-400 ml-1 flex items-center gap-1">
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  {t("post.uploading")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="text-xs text-gray-400 bg-transparent outline-none cursor-pointer hover:text-gray-600 transition-colors dark:hover:text-gray-300"
              >
                <option value="PUBLIC">{t("post.public")}</option>
                <option value="FRIENDS">{t("post.friends")}</option>
                <option value="PRIVATE">{t("post.private")}</option>
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
                    {t("post.publishing")}
                  </span>
                ) : (
                  t("post.publish")
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
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t("post.createTitle")}</h2>
            <button
              onClick={closeModal}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
              aria-label={t("common.close")}
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
    <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-[#F9F9F9] dark:bg-gray-950">
      {formInner}
    </div>
  );
}

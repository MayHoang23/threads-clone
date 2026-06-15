"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import MentionTextarea from "@/components/ui/MentionTextarea";
import QuotedPostCard from "./QuotedPostCard";

function Avatar({ user }) {
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
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

// Modal trích dẫn (quote) một bài viết.
// post = bài gốc cần trích dẫn. Sau khi đăng → dispatch 'post-created'.
export default function QuoteModal({ post, currentUser, onClose }) {
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const textareaRef = useRef(null);

  // Khoá scroll body + auto focus khi mở
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const id = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(id);
    };
  }, []);

  // MentionTextarea trả về chuỗi value mới + tự co giãn chiều cao
  const handleChange = (value) => {
    setContent(value);
    if (warning) setWarning("");
  };

  const charsLeft = 500 - content.length;
  // Quote được phép không có nội dung (chỉ trích dẫn bài gốc)
  const canPost = charsLeft >= 0 && !loading;

  const handleSubmit = async () => {
    if (!canPost) return;
    setLoading(true);
    setWarning("");
    try {
      const data = await fetchAPI(`/posts/${post.id}/quote`, {
        method: "POST",
        body: JSON.stringify({ content: content.trim() || null }),
      });
      if (data?.success) {
        window.dispatchEvent(new CustomEvent("post-created", { detail: data.data }));
        onClose();
      }
    } catch (err) {
      if (err.status === 422) {
        setWarning(err.message || "Nội dung vi phạm chính sách cộng đồng");
      } else {
        setWarning(err.message || "Đăng thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-950 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t("post.quoteTitle")}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            aria-label={t("common.close")}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <div className="flex gap-3">
            <Avatar user={currentUser} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {currentUser?.username ?? "..."}
              </p>

              <MentionTextarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                placeholder={t("post.quotePlaceholder")}
                rows={3}
                className="w-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none bg-transparent leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                }}
              />

              {warning && (
                <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2">
                  <span className="text-red-500 text-sm mt-0.5">⚠️</span>
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{warning}</p>
                </div>
              )}

              {/* Bài gốc được trích dẫn (không điều hướng khi bấm trong modal) */}
              <QuotedPostCard post={post} disableLink />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
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
      </div>
    </div>
  );
}

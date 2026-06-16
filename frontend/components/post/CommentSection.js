"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { fetchAPI } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import MentionTextarea from "@/components/ui/MentionTextarea";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// EmojiPicker truy cập window khi mount → tải động phía client để tránh lỗi SSR
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function timeAgo(dateStr, justNow = "vừa xong") {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60) return justNow;
  if (s < 3600) return `${Math.floor(s / 60)}ph`;
  if (s < 86400) return `${Math.floor(s / 3600)}g`;
  return `${Math.floor(s / 86400)}ng`;
}

function UserAvatar({ user, size = "md" }) {
  const cls = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";
  return (
    <div className={`${cls} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold select-none">
          {user?.username?.[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

// Ảnh đính kèm trong 1 comment / reply — click mở full size tab mới
function CommentImage({ url }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 w-fit">
      <img
        src={url}
        alt=""
        className="rounded-xl max-w-[240px] max-h-[300px] object-cover border border-gray-100 dark:border-gray-700"
      />
    </a>
  );
}

// Ô soạn comment/reply dùng chung: @mention + emoji picker + đính kèm ảnh.
// Tự quản lý text + ảnh; gọi onSubmit(content, mediaUrl) → trả về true nếu thành công để reset.
function CommentComposer({ placeholder, sendLabel, onSubmit, autoFocus = false, compact = false }) {
  const { isDark } = useTheme();
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState(null); // URL Cloudinary sau khi upload xong
  const [preview, setPreview] = useState(null); // object URL để xem trước tức thì
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef(null);
  const taRef = useRef(null);
  const emojiRef = useRef(null);

  // Đóng emoji picker khi click ra ngoài
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  // Giải phóng object URL khi unmount / đổi ảnh
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const canSubmit = (text.trim() || mediaUrl) && !posting && !uploading;

  // Chèn emoji vào đúng vị trí con trỏ trong textarea
  const insertEmoji = (emoji) => {
    const ta = taRef.current;
    if (!ta) {
      setText((p) => p + emoji);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    // Khôi phục con trỏ ngay sau emoji vừa chèn (sau khi React re-render)
    setTimeout(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const clearMedia = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMediaUrl(null);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset để chọn lại cùng 1 file được
    if (!file || !file.type.startsWith("image/")) return;

    // Xem trước ngay bằng object URL trong khi đang upload
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setMediaUrl(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API_BASE}/media/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: form,
      });
      const data = await res.json();
      if (data?.success) setMediaUrl(data.data.url);
      else clearMedia();
    } catch {
      clearMedia();
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setPosting(true);
    try {
      const ok = await onSubmit(text.trim(), mediaUrl);
      if (ok) {
        setText("");
        clearMedia();
        setShowEmoji(false);
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Preview ảnh đính kèm */}
      {preview && (
        <div className="relative inline-block mb-2">
          <img src={preview} alt="" className="rounded-xl max-h-32 max-w-[180px] object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <button
            type="button"
            onClick={clearMedia}
            className="absolute -top-2 -right-2 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <MentionTextarea
            ref={taRef}
            value={text}
            onChange={setText}
            placeholder={placeholder}
            rows={1}
            autoFocus={autoFocus}
            className={`w-full block text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-2xl ${
              compact ? "px-3 py-2" : "px-4 py-2"
            } outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all resize-none`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>

        {/* Nút emoji + popup */}
        <div className="relative flex-shrink-0" ref={emojiRef}>
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Emoji"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          {showEmoji && (
            <div className="absolute right-0 top-full mt-2 z-50 shadow-xl rounded-lg">
              <EmojiPicker
                onEmojiClick={(d) => insertEmoji(d.emoji)}
                theme={isDark ? "dark" : "light"}
                width={300}
                height={380}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
                searchPlaceHolder="Tìm emoji..."
              />
            </div>
          )}
        </div>

        {/* Nút đính kèm ảnh */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
          title="Đính kèm ảnh"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        {/* Nút gửi */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="text-sm font-semibold text-black dark:text-white disabled:opacity-30 transition-opacity flex-shrink-0 px-1"
        >
          {posting ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            sendLabel
          )}
        </button>

        {/* Hidden file input — chỉ nhận ảnh */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

// Component hiển thị 1 comment + form reply
function CommentItem({ comment, postId, onReplyAdded, t }) {
  const [showReply, setShowReply] = useState(false);

  const handleReply = async (content, mediaUrl) => {
    try {
      const data = await fetchAPI(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, mediaUrl, parentId: comment.id }),
      });
      if (data?.success) {
        onReplyAdded(comment.id, data.data); // Thêm reply vào danh sách
        setShowReply(false);
        return true;
      }
    } catch {
      // Lỗi gửi reply — giữ nguyên nội dung để user thử lại
    }
    return false;
  };

  return (
    <div className="py-3">
      {/* Comment gốc */}
      <div className="flex gap-3">
        <UserAvatar user={comment.user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{comment.user?.username}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(comment.createdAt, t("common.justNow"))}</span>
          </div>
          {comment.content && (
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 leading-relaxed break-words">{comment.content}</p>
          )}
          {comment.mediaUrl && <CommentImage url={comment.mediaUrl} />}
          <button
            onClick={() => setShowReply((v) => !v)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-1.5 font-medium transition-colors"
          >
            {t("comments.reply")}
          </button>

          {/* Form reply */}
          {showReply && (
            <div className="mt-2">
              <CommentComposer
                compact
                autoFocus
                placeholder={`Trả lời @${comment.user?.username}...`}
                sendLabel={t("comments.send")}
                onSubmit={handleReply}
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies nested — thụt vào bên phải với đường viền */}
      {comment.replies?.length > 0 && (
        <div className="ml-11 mt-1 pl-3 border-l-2 border-gray-100 dark:border-gray-700 space-y-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-2.5 pt-2">
              <UserAvatar user={reply.user} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white">{reply.user?.username}</span>
                  <span className="text-xs text-gray-400">{timeAgo(reply.createdAt)}</span>
                </div>
                {reply.content && (
                  <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 leading-relaxed break-words">{reply.content}</p>
                )}
                {reply.mediaUrl && <CommentImage url={reply.mediaUrl} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ postId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // Load comments khi component mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI(`/posts/${postId}/comments`);
        if (data?.success) setComments(data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  const handleAddComment = async (content, mediaUrl) => {
    try {
      const data = await fetchAPI(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, mediaUrl }),
      });
      if (data?.success) {
        // Thêm comment mới vào cuối danh sách kèm replies rỗng
        setComments((prev) => [...prev, { ...data.data, replies: [] }]);
        return true;
      }
    } catch {
      // Lỗi gửi comment — giữ nguyên nội dung để user thử lại
    }
    return false;
  };

  // Thêm reply vào đúng comment cha
  const handleReplyAdded = (parentId, reply) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c
      )
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
          {t("comments.title")}{comments.length > 0 ? ` (${comments.length})` : ""}
        </h3>
      </div>

      {/* Form thêm comment mới */}
      {currentUser && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-xs font-bold">
                {currentUser.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <CommentComposer
            placeholder={t("comments.placeholder")}
            sendLabel={t("comments.send")}
            onSubmit={handleAddComment}
          />
        </div>
      )}

      {/* Danh sách comments */}
      <div className="px-4">
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-14 text-center text-gray-400 dark:text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("comments.empty")}</p>
            <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">{t("comments.emptyDesc")}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReplyAdded={handleReplyAdded}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

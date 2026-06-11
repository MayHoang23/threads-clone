"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

// Format thời gian kiểu Threads: "vừa xong", "5ph", "2g", "3ng"
function timeAgo(dateStr, justNow = "vừa xong") {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return justNow;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}ph`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}g`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}ng`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

// Tô màu xanh các hashtag trong nội dung
function RichContent({ text }) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <Link
            key={i}
            href={`/hashtag/${part.slice(1)}`}
            className="text-blue-500 hover:underline"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Avatar với fallback chữ cái đầu username
function Avatar({ user, size = "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${dim} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0`}>
      {user?.avatar ? (
        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold select-none">
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post: initialPost, currentUser, onDelete, onUnsave }) {
  const [post, setPost] = useState(initialPost);
  const [showMenu, setShowMenu] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const { t } = useLanguage();

  const isOwner = currentUser?.id === post.author?.id;

  // Optimistic like: cập nhật UI ngay, gọi API sau
  const handleLike = async () => {
    const wasLiked = post.isLiked;
    setPost((p) => ({
      ...p,
      isLiked: !wasLiked,
      likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1,
    }));
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 300);

    try {
      await fetchAPI(`/posts/${post.id}/like`, { method: "POST" });
    } catch {
      // Rollback nếu API thất bại
      setPost((p) => ({
        ...p,
        isLiked: wasLiked,
        likeCount: wasLiked ? p.likeCount + 1 : p.likeCount - 1,
      }));
    }
  };

  const handleSave = async () => {
    const wasSaved = post.isSaved;
    setPost((p) => ({ ...p, isSaved: !wasSaved }));
    try {
      await fetchAPI(`/posts/${post.id}/save`, { method: "POST" });
      if (wasSaved) {
        window.dispatchEvent(new CustomEvent("post-unsaved", { detail: post }));
        onUnsave?.(post);
      } else {
        window.dispatchEvent(new CustomEvent("post-saved", { detail: post }));
      }
    } catch {
      setPost((p) => ({ ...p, isSaved: wasSaved }));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("post.confirmDelete"))) return;
    setShowMenu(false);
    await fetchAPI(`/posts/${post.id}`, { method: "DELETE" });
    onDelete?.(post.id);
  };

  const handleReport = async () => {
    setShowMenu(false);
    const reason = prompt("Lý do báo cáo (tùy chọn):");
    if (reason === null) return; // user bấm Cancel
    try {
      const res = await fetchAPI(`/posts/${post.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || "Vi phạm tiêu chuẩn cộng đồng" }),
      });
      if (res?.success) alert("Đã gửi báo cáo. Chúng tôi sẽ xem xét sớm.");
      else alert(res?.message || "Báo cáo thất bại");
    } catch {
      alert("Lỗi kết nối");
    }
  };

  return (
    <>
      {/* Overlay bắt click ra ngoài để đóng menu */}
      {showMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
      )}

      <article className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100/40 dark:hover:bg-gray-800/20 transition-colors">
        <div className="flex gap-3">
          {/* ---- Cột trái: avatar + đường thread ---- */}
          <div className="flex flex-col items-center">
            <Link href={`/profile/${post.author?.username}`}>
              <Avatar user={post.author} />
            </Link>
            {/* Đường dọc nối xuống (giống Threads) */}
            <div className="w-0.5 bg-gray-150 flex-1 mt-2 min-h-[16px] rounded-full" style={{ backgroundColor: "#e5e7eb" }} />
          </div>

          {/* ---- Cột phải: nội dung ---- */}
          <div className="flex-1 min-w-0 pb-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <Link
                  href={`/profile/${post.author?.username}`}
                  className="font-semibold text-sm text-gray-900 dark:text-white hover:underline underline-offset-2 truncate"
                >
                  {post.author?.username}
                </Link>
                {post.author?.isVerified && (
                  /* Badge xác minh */
                  <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.45 4.506 3.745 3.745 0 01-4.506.45A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-4.506-.45 3.745 3.745 0 01-.45-4.506A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.45-4.506 3.745 3.745 0 014.506-.45A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 014.506.45 3.745 3.745 0 01.45 4.506A3.745 3.745 0 0121 12z" />
                  </svg>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(post.createdAt, t("common.justNow"))}</span>
              </div>

              {/* Menu 3 chấm */}
              <div className="relative z-20 flex-shrink-0">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="p-1.5 -mr-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="19" cy="12" r="1.5" />
                  </svg>
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden min-w-[160px] text-sm">
                    {isOwner ? (
                      <>
                        <button className="w-full text-left px-4 py-3 font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          {t("post.edit")}
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full text-left px-4 py-3 font-semibold text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          {t("post.delete")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleReport}
                        className="w-full text-left px-4 py-3 font-semibold text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        {t("post.report")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Nội dung bài */}
            {post.content && (
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed mb-3 whitespace-pre-wrap break-words">
                <RichContent text={post.content} />
              </p>
            )}

            {/* ===== MEDIA GRID =====
                Layout:
                - 1 media (ảnh/video): full width
                - 2 ảnh: 2 cột đều nhau
                - 3 ảnh: ảnh 1 chiếm cả hàng trên, 2 ảnh nhỏ hàng dưới
                - 4 ảnh: lưới 2x2 */}
            {post.media?.length > 0 && (
              <div className="mb-3 rounded-2xl overflow-hidden">
                {post.media[0].type === "VIDEO" ? (
                  /* Video — 16:9, có controls và preload metadata */
                  <div className="relative bg-black aspect-video">
                    <video
                      src={post.media[0].url}
                      className="w-full h-full"
                      controls
                      preload="metadata"
                      playsInline
                    />
                  </div>
                ) : (
                  /* Ảnh — layout thay đổi theo số lượng */
                  <div
                    className={`grid gap-0.5 ${
                      post.media.length === 1
                        ? "grid-cols-1"
                        : post.media.length === 3
                        ? "grid-cols-2"
                        : "grid-cols-2"
                    }`}
                  >
                    {post.media.slice(0, 4).map((m, idx) => {
                      // Layout đặc biệt cho 3 ảnh: ảnh đầu chiếm full hàng
                      const isFirstOfThree = post.media.length === 3 && idx === 0;
                      return (
                        <div
                          key={m.id}
                          className={`relative bg-gray-100 dark:bg-gray-800 overflow-hidden ${
                            post.media.length === 1
                              ? "aspect-[4/3]"
                              : isFirstOfThree
                              ? "col-span-2 aspect-[16/9]"
                              : "aspect-square"
                          }`}
                        >
                          <img
                            src={m.url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          {/* Overlay "+N" trên ảnh thứ 4 nếu có nhiều hơn 4 */}
                          {idx === 3 && post.media.length > 4 && (
                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                              <span className="text-white font-bold text-2xl">
                                +{post.media.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-0.5 -ml-1.5 mt-1">
              {/* Like */}
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <svg
                  className={`w-[22px] h-[22px] transition-all duration-200 ${heartAnim ? "scale-125" : "scale-100"} ${
                    post.isLiked ? "text-red-500 fill-current" : "text-gray-500 dark:text-gray-400 group-hover:text-red-400"
                  }`}
                  viewBox="0 0 24 24"
                  fill={post.isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {post.likeCount > 0 && (
                  <span className={`text-xs font-medium ${post.isLiked ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                    {post.likeCount}
                  </span>
                )}
              </button>

              {/* Comment → đến post detail */}
              <Link
                href={`/posts/${post.id}`}
                className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <svg className="w-[22px] h-[22px] text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {post.commentCount > 0 && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{post.commentCount}</span>
                )}
              </Link>

              {/* Repost (placeholder) */}
              <button className="px-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                <svg className="w-[22px] h-[22px] text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 014-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 01-4 4H3" />
                </svg>
              </button>

              {/* Save — đặt sát phải */}
              <button
                onClick={handleSave}
                className="ml-auto px-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <svg
                  className={`w-[22px] h-[22px] transition-colors ${
                    post.isSaved
                      ? "text-black dark:text-white"
                      : "text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white"
                  }`}
                  viewBox="0 0 24 24"
                  fill={post.isSaved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              </button>
            </div>

            {/* Footer: số thích + bình luận */}
            {(post.likeCount > 0 || post.commentCount > 0) && (
              <div className="flex gap-3 mt-1.5">
                {post.commentCount > 0 && (
                  <Link href={`/posts/${post.id}`} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    {post.commentCount} {t("post.comments")}
                  </Link>
                )}
                {post.likeCount > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{post.likeCount} {t("post.likes")}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </>
  );
}

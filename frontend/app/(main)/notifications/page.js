"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

const DAY_MS = 24 * 60 * 60 * 1000;

// Thời gian relative dạng ngắn kiểu Threads: vừa xong / 5ph / 2g / 3ng
function timeAgo(dateStr, t) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return t("notifications.justNow");
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}${t("notifications.minuteShort")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t("notifications.hourShort")}`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}${t("notifications.dayShort")}`;
  const w = Math.floor(d / 7);
  return `${w}${t("notifications.weekShort")}`;
}

// Cấu hình màu border avatar theo loại notification
const TYPE_BORDER = {
  LIKE: "border-red-400",
  COMMENT: "border-violet-400",
  COMMENT_LIKE: "border-pink-400",
  MENTION: "border-violet-500",
  FOLLOW: "border-green-400",
  REPOST: "border-green-400",
  FRIEND_REQUEST: "border-yellow-400",
  POST_HIDDEN: "border-red-500",
};

function getNotificationText(type, t) {
  switch (type) {
    case "LIKE": return t("notifications.liked");
    case "COMMENT": return t("notifications.commented");
    case "COMMENT_LIKE": return t("notifications.commentLiked");
    case "FOLLOW": return t("notifications.followed");
    case "FRIEND_REQUEST": return t("notifications.friendRequest");
    case "MENTION": return t("notifications.mentioned");
    case "REPOST": return t("notifications.reposted");
    case "POST_HIDDEN": return t("notifications.postHidden");
    default: return t("notifications.interacted");
  }
}

// Nhóm notification theo mốc thời gian: Hôm nay (<24h) / Tuần này (2-7 ngày) / Trước đó (>7 ngày)
function groupByTime(items, t) {
  const now = Date.now();
  const buckets = { today: [], week: [], earlier: [] };
  for (const n of items) {
    const diff = now - new Date(n.createdAt).getTime();
    if (diff < DAY_MS) buckets.today.push(n);
    else if (diff < 7 * DAY_MS) buckets.week.push(n);
    else buckets.earlier.push(n);
  }
  const groups = [];
  if (buckets.today.length) groups.push({ key: "today", label: t("notifications.today"), items: buckets.today });
  if (buckets.week.length) groups.push({ key: "week", label: t("notifications.thisWeek"), items: buckets.week });
  if (buckets.earlier.length) groups.push({ key: "earlier", label: t("notifications.earlier"), items: buckets.earlier });
  return groups;
}

// Icon nhỏ overlay theo loại (màu + shape)
function NotificationIcon({ type }) {
  const base = "w-3 h-3";
  if (type === "POST_HIDDEN") return (
    <svg className={`${base} text-red-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3z" />
    </svg>
  );
  if (type === "LIKE") return (
    <svg className={`${base} text-red-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
  if (type === "COMMENT_LIKE") return (
    <svg className={`${base} text-pink-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
  if (type === "COMMENT") return (
    <svg className={`${base} text-violet-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
  if (type === "REPOST") return (
    <svg className={`${base} text-green-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
  if (type === "FOLLOW") return (
    <svg className={`${base} text-green-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
  if (type === "FRIEND_REQUEST") return (
    <svg className={`${base} text-yellow-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
  if (type === "MENTION") return (
    <svg className={`${base} text-violet-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
    </svg>
  );
  return null;
}

// Thumbnail bài viết bên phải (ảnh hoặc video)
function PostThumbnail({ media }) {
  const item = media?.[0];
  if (!item) return null;
  if (item.type === "VIDEO") {
    return (
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black">
        <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    );
  }
  return (
    <img
      src={item.url}
      alt=""
      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800"
    />
  );
}

// Skeleton 1 dòng
function NotificationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 dark:border-gray-900 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
      </div>
      <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const bottomRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = groupByTime(notifications, t);

  // Load lần đầu
  useEffect(() => {
    loadNotifications();
  }, []);

  // Infinite scroll
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          loadNotifications(cursor).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1, rootMargin: "80px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, cursor]);

  const loadNotifications = async (cursorParam = null) => {
    const qs = cursorParam ? `?cursor=${cursorParam}&limit=20` : "?limit=20";
    const res = await fetchAPI(`/notifications${qs}`);
    if (res?.success) {
      const { notifications: newItems, nextCursor, hasMore: more } = res.data;
      setNotifications((prev) => (cursorParam ? [...prev, ...newItems] : newItems));
      setCursor(nextCursor);
      setHasMore(more);
    }
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await fetchAPI("/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const handleClickNotification = async (notification) => {
    // Đánh dấu đã đọc trước khi navigate
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      fetchAPI(`/notifications/${notification.id}/read`, { method: "PATCH" }).catch(() => {});
    }

    // Navigate đến trang liên quan
    if (notification.type === "FOLLOW" || notification.type === "FRIEND_REQUEST") {
      router.push(`/profile/${notification.sender?.username}`);
    } else if (notification.post?.id) {
      router.push(`/posts/${notification.post.id}`);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Không trigger click notification khi xóa
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetchAPI(`/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-bold text-xl">{t("notifications.title")}</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="text-sm text-blue-500 font-semibold hover:text-blue-600 transition-colors disabled:opacity-60"
            >
              {markingAll ? t("notifications.processing") : t("notifications.markAllReadFull")}
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        Array.from({ length: 6 }).map((_, i) => <NotificationSkeleton key={i} />)
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div className="py-24 text-center px-6">
          <div className="text-6xl mb-4">🔔</div>
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{t("notifications.empty")}</p>
          <p className="text-sm text-gray-400">{t("notifications.emptyDesc")}</p>
        </div>
      )}

      {/* Danh sách thông báo theo nhóm thời gian */}
      {!loading && notifications.length > 0 && (
        <>
          {groups.map((group) => (
            <div key={group.key}>
              {/* Header nhóm thời gian */}
              <div className="px-4 pt-4 pb-1.5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {group.label}
                </h2>
              </div>

              {group.items.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleClickNotification(notification)}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-900 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors group ${
                    !notification.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {/* Avatar + icon loại với border màu theo type */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 ${
                        TYPE_BORDER[notification.type] || "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {!notification.sender ? (
                        // Notification hệ thống (POST_HIDDEN) — không có người gửi
                        <div className="w-full h-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-white">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3z" />
                          </svg>
                        </div>
                      ) : notification.sender.avatar ? (
                        <img src={notification.sender.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-base">
                          {notification.sender.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Icon nhỏ overlay góc dưới phải avatar */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-950 rounded-full flex items-center justify-center shadow-sm ring-1 ring-gray-100 dark:ring-gray-800">
                      <NotificationIcon type={notification.type} />
                    </div>
                  </div>

                  {/* Nội dung */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      {notification.sender && (
                        <span className="font-semibold">
                          {notification.sender.displayName || notification.sender.username}{" "}
                        </span>
                      )}
                      <span className="text-gray-600 dark:text-gray-300">
                        {getNotificationText(notification.type, t)}
                      </span>
                      <span className="text-gray-400 ml-1">· {timeAgo(notification.createdAt, t)}</span>
                    </p>
                    {/* Preview nội dung bài viết liên quan */}
                    {notification.post?.content && (
                      <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{notification.post.content}</p>
                    )}
                  </div>

                  {/* Thumbnail bài viết bên phải */}
                  {notification.post?.media?.length > 0 && (
                    <PostThumbnail media={notification.post.media} />
                  )}

                  {/* Chấm chưa đọc + nút xóa */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.isRead && (
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-all"
                      title="Xóa thông báo"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Trigger infinite scroll */}
          <div ref={bottomRef} className="py-6 flex justify-center">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            )}
            {!hasMore && (
              <p className="text-xs text-gray-400">{t("notifications.end")}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

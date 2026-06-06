"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";

// Format thời gian kiểu Threads
function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "vừa xong";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function getNotificationText(type) {
  switch (type) {
    case "LIKE": return "đã thích bài viết của bạn";
    case "COMMENT": return "đã bình luận về bài viết của bạn";
    case "FOLLOW": return "đã bắt đầu theo dõi bạn";
    case "FRIEND_REQUEST": return "đã gửi lời mời kết bạn";
    case "MENTION": return "đã nhắc đến bạn";
    default: return "đã tương tác với bạn";
  }
}

// Icon theo loại notification
function NotificationIcon({ type }) {
  const base = "w-5 h-5";
  if (type === "LIKE") return (
    <svg className={`${base} text-red-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
  if (type === "COMMENT") return (
    <svg className={`${base} text-blue-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
  if (type === "FOLLOW") return (
    <svg className={`${base} text-green-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
  if (type === "FRIEND_REQUEST") return (
    <svg className={`${base} text-purple-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
  return null;
}

// Skeleton 1 dòng
function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 border-b border-gray-50 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const bottomRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
      router.push(`/profile/${notification.sender.username}`);
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
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-bold text-xl">Thông báo</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="text-sm text-blue-500 font-semibold hover:text-blue-600 transition-colors disabled:opacity-60"
            >
              {markingAll ? "Đang xử lý..." : "Đánh dấu tất cả đã đọc"}
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
          <p className="font-semibold text-gray-700 mb-1">Chưa có thông báo</p>
          <p className="text-sm text-gray-400">Khi có người thích hoặc bình luận bài của bạn, bạn sẽ thấy ở đây</p>
        </div>
      )}

      {/* Danh sách thông báo */}
      {!loading && notifications.length > 0 && (
        <>
          <div>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleClickNotification(notification)}
                className={`flex items-start gap-3 px-4 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50/60 transition-colors group ${
                  !notification.isRead ? "bg-blue-50/40" : ""
                }`}
              >
                {/* Cột trái: avatar + icon loại */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden">
                    {notification.sender.avatar ? (
                      <img src={notification.sender.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-base">
                        {notification.sender.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Icon nhỏ overlay góc dưới phải avatar */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <NotificationIcon type={notification.type} />
                  </div>
                </div>

                {/* Nội dung */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">
                      {notification.sender.displayName || notification.sender.username}
                    </span>
                    {" "}{getNotificationText(notification.type)}
                  </p>
                  {/* Preview nội dung bài viết liên quan */}
                  {notification.post?.content && (
                    <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{notification.post.content}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
                </div>

                {/* Bên phải: chấm xanh + nút xóa */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  {!notification.isRead && (
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  )}
                  {/* Nút xóa — chỉ hiện khi hover */}
                  <button
                    onClick={(e) => handleDelete(e, notification.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full transition-all"
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

          {/* Trigger infinite scroll */}
          <div ref={bottomRef} className="py-6 flex justify-center">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            )}
            {!hasMore && (
              <p className="text-xs text-gray-400">Đã hết thông báo</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

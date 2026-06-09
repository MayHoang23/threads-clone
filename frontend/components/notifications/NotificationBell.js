"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { useSocket } from "@/contexts/SocketContext";

// Format thời gian ngắn gọn: "2ph", "3g", "5ng"
function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "vừa xong";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}ph`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}g`;
  return `${Math.floor(h / 24)}ng`;
}

// Text mô tả hành động theo loại notification
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

// URL điều hướng khi click vào notification
function getNotificationHref(notification) {
  if (notification.type === "FOLLOW" || notification.type === "FRIEND_REQUEST") {
    return `/profile/${notification.sender.username}`;
  }
  if (notification.post?.id) return `/posts/${notification.post.id}`;
  return "/notifications";
}

// 1 dòng notification trong dropdown
function NotificationItem({ notification, onRead, onClose }) {
  const router = useRouter();
  const href = getNotificationHref(notification);

  const handleClick = async () => {
    onClose();
    // Đánh dấu đã đọc — fire-and-forget
    if (!notification.isRead) {
      onRead(notification.id);
      fetchAPI(`/notifications/${notification.id}/read`, { method: "PATCH" }).catch(() => {});
    }
    router.push(href);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${
        !notification.isRead ? "bg-blue-50/60 dark:bg-blue-950/40" : ""
      }`}
    >
      {/* Avatar người gửi */}
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
        {notification.sender.avatar ? (
          <img src={notification.sender.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-sm font-bold">
            {notification.sender.username?.[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Nội dung */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-gray-900 dark:text-white">{notification.sender.displayName || notification.sender.username}</span>
          {" "}{getNotificationText(notification.type)}
        </p>
        {notification.post?.content && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{notification.post.content}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>

      {/* Chấm xanh = chưa đọc */}
      {!notification.isRead && (
        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
      )}
    </button>
  );
}

// ========================
// NOTIFICATION BELL — dùng trong Desktop Sidebar
// ========================
export default function NotificationBell({ isActive }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const socket = useSocket();

  // Load số chưa đọc khi mount
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Lắng nghe notification mới khi socket sẵn sàng
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      // Notification mới: tăng badge + thêm vào đầu danh sách
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on("new_notification", handleNewNotification);
    return () => socket.off("new_notification", handleNewNotification);
  }, [socket]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    const res = await fetchAPI("/notifications/unread-count");
    if (res?.success) setUnreadCount(res.data.count);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    const res = await fetchAPI("/notifications?limit=15");
    if (res?.success) {
      setNotifications(res.data.notifications);
      setLoaded(true);
    }
    setLoading(false);
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    if (!loaded) fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await fetchAPI("/notifications/read-all", { method: "PATCH" });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Đánh dấu đã đọc 1 item (optimistic)
  const handleRead = useCallback((id) => {
    setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Nút bell — có hình dạng như nav item */}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-colors w-full font-medium text-sm ${
          isOpen || isActive
            ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-semibold"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-black dark:hover:text-white"
        }`}
      >
        {/* Icon + badge */}
        <div className="relative">
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill={isOpen || isActive ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        Thông báo
      </button>

      {/* ===== DROPDOWN ===== */}
      {isOpen && (
        <div className="absolute left-full top-0 ml-3 w-[340px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Thông báo</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-500 font-semibold hover:text-blue-600 transition-colors"
                >
                  Đánh dấu đã đọc
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                Xem tất cả
              </Link>
            </div>
          </div>

          {/* Danh sách thông báo */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-sm text-gray-400 dark:text-gray-500">Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onRead={handleRead}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================
// MOBILE BELL — dùng trong bottom navbar (chỉ badge + link)
// ========================
export function MobileNotificationBell({ isActive }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocket();

  // Load số chưa đọc khi mount
  useEffect(() => {
    const fetchCount = async () => {
      const res = await fetchAPI("/notifications/unread-count");
      if (res?.success) setUnreadCount(res.data.count);
    };
    fetchCount();
  }, []);

  // Lắng nghe notification mới khi socket sẵn sàng
  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnreadCount((c) => c + 1);
    socket.on("new_notification", handler);
    return () => socket.off("new_notification", handler);
  }, [socket]);

  return (
    <Link
      href="/notifications"
      className={`relative flex flex-col items-center p-2 rounded-2xl transition-colors ${
        isActive ? "text-black" : "text-gray-400"
      }`}
    >
      <div className="relative">
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill={isActive ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}

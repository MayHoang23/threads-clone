"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

// Format thời gian ngắn gọn
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "vừa xong";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}ph`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}g`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}ng`;
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function Avatar({ user, size = "w-12 h-12" }) {
  return (
    <div className={`${size} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-sm">
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

// Props:
//   conversations: array từ API
//   selectedId: string | null
//   onSelect(id): callback khi chọn conversation
//   onUpdate(updatedConv): callback khi nhận "new_dm" — update preview + unread
export default function ConversationList({ conversations, selectedId, onSelect, onUpdate, currentUserId }) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    // Lắng nghe "new_dm" để cập nhật preview và badge unread
    const handleNewDM = ({ conversationId, message }) => {
      onUpdate?.({ conversationId, lastMessage: message });
    };

    socket.on("new_dm", handleNewDM);
    return () => socket.off("new_dm", handleNewDM);
  }, [onUpdate]);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Chưa có tin nhắn nào</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Nhắn tin với bạn bè từ trang hồ sơ của họ</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;
        const hasUnread = conv.unreadCount > 0;
        const preview = conv.lastMessage
          ? (conv.lastMessage.senderId === currentUserId ? "Bạn: " : "") +
            (conv.lastMessage.mediaUrl ? "📷 Ảnh" : conv.lastMessage.content?.slice(0, 50) || "")
          : "Hãy bắt đầu cuộc trò chuyện";

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
              isSelected
                ? "bg-gray-100 dark:bg-gray-800"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            <Avatar user={conv.otherUser} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm truncate ${hasUnread ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-800 dark:text-gray-200"}`}>
                  {conv.otherUser?.displayName || conv.otherUser?.username || "Người dùng"}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {timeAgo(conv.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className={`text-xs truncate ${hasUnread ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                  {preview}
                </p>
                {hasUnread && (
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold flex items-center justify-center">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

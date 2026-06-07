"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import MessageInput from "./MessageInput";

// ========================
// HELPER: Nhóm tin theo ngày
// ========================
function getDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ user, size = "w-8 h-8" }) {
  return (
    <div className={`${size} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-xs">
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

// ========================
// READ RECEIPT ICON
// ========================
function ReadReceipt({ isSent, isRead }) {
  if (!isSent) return null;
  return (
    <span className="text-[10px] ml-1 flex-shrink-0" title={isRead ? "Đã đọc" : "Đã gửi"}>
      {isRead ? (
        <span className="text-blue-500">✓✓</span>
      ) : (
        <span className="text-gray-400">✓</span>
      )}
    </span>
  );
}

// ========================
// TYPING INDICATOR
// ========================
function TypingIndicator({ user }) {
  return (
    <div className="flex items-end gap-2 px-4 pb-2">
      <Avatar user={user} />
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-2.5">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================
// MAIN COMPONENT
// ========================
// Props:
//   conversationId: string
//   otherUser: { id, username, displayName, avatar }
//   currentUser: { id, username, ... }
//   onBack: callback mobile (quay lại list)
export default function ChatWindow({ conversationId, otherUser, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [typingUser, setTypingUser] = useState(null); // user đang gõ
  const [isAtBottom, setIsAtBottom] = useState(true);

  const messagesEndRef = useRef(null); // để scroll to bottom
  const containerRef = useRef(null);   // container để detect scroll
  const socketRef = useRef(null);
  const prevScrollHeightRef = useRef(0); // giữ scroll position khi load more

  // ========================
  // LOAD TIN NHẮN BAN ĐẦU
  // ========================
  const loadInitialMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoadingInit(true);
    try {
      const data = await fetchAPI(`/conversations/${conversationId}/messages`);
      if (data?.success) {
        setMessages(data.data.messages);
        setHasMore(data.data.hasMore);
        setNextCursor(data.data.nextCursor);
      }
    } catch {
      // Giữ trống nếu lỗi
    } finally {
      setLoadingInit(false);
    }
  }, [conversationId]);

  // ========================
  // LOAD TIN CŨ HƠN (scroll lên)
  // ========================
  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);

    // Lưu scroll height trước khi thêm tin cũ — để restore position sau
    prevScrollHeightRef.current = containerRef.current?.scrollHeight ?? 0;

    try {
      const data = await fetchAPI(`/conversations/${conversationId}/messages?cursor=${nextCursor}`);
      if (data?.success) {
        setMessages((prev) => [...data.data.messages, ...prev]); // Thêm vào đầu
        setHasMore(data.data.hasMore);
        setNextCursor(data.data.nextCursor);
      }
    } catch {
      // pass
    } finally {
      setLoadingMore(false);
    }
  };

  // Sau khi thêm tin cũ, restore scroll position để user không bị giật
  useEffect(() => {
    if (loadingMore) return;
    const container = containerRef.current;
    if (!container || !prevScrollHeightRef.current) return;
    const diff = container.scrollHeight - prevScrollHeightRef.current;
    container.scrollTop += diff;
    prevScrollHeightRef.current = 0;
  }, [messages, loadingMore]);

  // ========================
  // SCROLL ĐẾN CUỐI
  // ========================
  const scrollToBottom = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  };

  // Scroll xuống sau khi load lần đầu
  useEffect(() => {
    if (!loadingInit && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [loadingInit]);

  // ========================
  // DETECT SCROLL POSITION (để quyết định có auto-scroll không)
  // ========================
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Coi là "ở dưới" nếu còn < 100px chưa scroll
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);

    // Load more khi scroll lên gần đầu
    if (scrollTop < 50 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  // ========================
  // SOCKET EVENTS
  // ========================
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    // Join conversation room
    socket.emit("join_conversation", { conversationId });

    // Nhận tin nhắn mới
    const handleNewMessage = (message) => {
      if (message.conversationId !== conversationId) return;

      setMessages((prev) => {
        // Tránh duplicate nếu là tin mình vừa gửi (đã có optimistic)
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      // Scroll xuống nếu đang ở cuối hoặc là tin của mình
      if (isAtBottom || message.senderId === currentUser?.id) {
        setTimeout(() => scrollToBottom(true), 50);
      }
    };

    // Tin đã được đọc → cập nhật isRead
    const handleMessagesRead = ({ readBy }) => {
      if (readBy === currentUser?.id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUser?.id && !m.isRead ? { ...m, isRead: true } : m
        )
      );
    };

    // Typing indicator
    const handleTyping = ({ userId }) => {
      if (userId !== currentUser?.id) setTypingUser(otherUser);
    };
    const handleStopTyping = () => setTypingUser(null);

    socket.on("new_message", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);
    socket.on("user_typing", handleTyping);
    socket.on("user_stop_typing", handleStopTyping);

    // Đánh dấu đã đọc khi mở chat
    fetchAPI(`/conversations/${conversationId}/read`, { method: "PATCH" }).catch(() => {});

    return () => {
      socket.emit("leave_conversation", { conversationId });
      socket.off("new_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
      socket.off("user_typing", handleTyping);
      socket.off("user_stop_typing", handleStopTyping);
    };
  }, [conversationId, currentUser?.id]);

  useEffect(() => {
    loadInitialMessages();
  }, [loadInitialMessages]);

  // ========================
  // GỬI TIN NHẮN (với optimistic update)
  // ========================
  const handleSend = async (content, mediaUrl) => {
    // Tạo optimistic message — hiển thị ngay trước khi API response
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      content,
      mediaUrl,
      senderId: currentUser.id,
      conversationId,
      createdAt: new Date().toISOString(),
      isRead: false,
      sender: currentUser,
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(true), 50);

    const data = await fetchAPI(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, mediaUrl }),
    });

    // Thay thế optimistic message bằng real message từ server
    if (data?.success) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...data.data, pending: false } : m))
      );
    } else {
      // Lỗi → đánh dấu failed
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true, pending: false } : m))
      );
    }
  };

  // ========================
  // NHÓM TIN NHẮN THEO NGÀY
  // ========================
  const groupedMessages = [];
  let lastDateLabel = null;

  for (const msg of messages) {
    const label = getDateLabel(msg.createdAt);
    if (label !== lastDateLabel) {
      groupedMessages.push({ type: "date_divider", label, id: `divider_${msg.id}` });
      lastDateLabel = label;
    }
    groupedMessages.push({ type: "message", ...msg });
  }

  // ========================
  // RENDER
  // ========================
  if (!conversationId || !otherUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <p className="font-semibold text-gray-700 dark:text-gray-300">Chọn một cuộc trò chuyện</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Hoặc bắt đầu cuộc trò chuyện mới</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ===== HEADER ===== */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
        {/* Nút back — chỉ hiện trên mobile */}
        {onBack && (
          <button onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 lg:hidden">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <Avatar user={otherUser} size="w-9 h-9" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {otherUser.displayName || otherUser.username}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">@{otherUser.username}</p>
        </div>
      </div>

      {/* ===== MESSAGE LIST ===== */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-white dark:bg-gray-950"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <span className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Loading skeleton ban đầu */}
        {loadingInit && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" style={{ width: `${120 + i * 30}px` }} />
              </div>
            ))}
          </div>
        )}

        {/* Grouped messages */}
        {!loadingInit && groupedMessages.map((item) => {
          if (item.type === "date_divider") {
            return (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">
                  {item.label}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>
            );
          }

          const isMine = item.senderId === currentUser?.id;

          return (
            <div
              key={item.id}
              className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
            >
              {/* Avatar người kia — chỉ hiện bên trái */}
              {!isMine && <Avatar user={otherUser} size="w-7 h-7" />}

              <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[70%]`}>
                {/* Ảnh đính kèm */}
                {item.mediaUrl && (
                  <img
                    src={item.mediaUrl}
                    alt="attachment"
                    className="rounded-2xl max-w-[240px] mb-1 cursor-pointer hover:opacity-95"
                    onClick={() => window.open(item.mediaUrl, "_blank")}
                  />
                )}

                {/* Nội dung text */}
                {item.content && (
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                      isMine
                        ? "bg-black dark:bg-white text-white dark:text-black rounded-br-none"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
                    } ${item.pending ? "opacity-60" : ""} ${item.failed ? "border border-red-300" : ""}`}
                  >
                    {item.content}
                  </div>
                )}

                {/* Thời gian + read receipt */}
                <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {item.failed ? "Gửi thất bại" : item.pending ? "Đang gửi..." : formatTime(item.createdAt)}
                  </span>
                  {isMine && !item.pending && !item.failed && (
                    <ReadReceipt isSent={true} isRead={item.isRead} />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUser && <TypingIndicator user={typingUser} />}

        {/* Anchor để scroll to bottom */}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== INPUT ===== */}
      <MessageInput
        onSend={handleSend}
        conversationId={conversationId}
        disabled={loadingInit}
      />
    </div>
  );
}

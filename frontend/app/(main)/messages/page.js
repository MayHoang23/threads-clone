"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { connectSocket, getSocket } from "@/lib/socket";
import { getAccessToken } from "@/lib/auth";
import ConversationList from "@/components/messages/ConversationList";
import ChatWindow from "@/components/messages/ChatWindow";

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  // Mobile: "list" | "chat"
  const [mobileView, setMobileView] = useState("list");

  const currentUser = getCurrentUser();

  // Conversation đang được chọn (full object)
  const selectedConv = conversations.find((c) => c.id === selectedId);

  // ========================
  // LOAD CONVERSATIONS
  // ========================
  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchAPI("/conversations");
      if (data?.success) setConversations(data.data);
    } catch {
      // pass
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();

    // Đảm bảo socket đã kết nối (NotificationBell cũng connect, nhưng phòng trường hợp)
    const token = getAccessToken();
    if (token) connectSocket(token);
  }, [loadConversations]);

  // ========================
  // CẬP NHẬT PREVIEW KHI NHẬN DM MỚI
  // ========================
  const handleConvUpdate = useCallback(({ conversationId, lastMessage }) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        // Tăng unread nếu conversation này KHÔNG đang được mở
        const isOpen = c.id === selectedId;
        return {
          ...c,
          lastMessage,
          lastMessageAt: lastMessage.createdAt,
          unreadCount: isOpen ? 0 : c.unreadCount + 1,
        };
      })
    );
  }, [selectedId]);

  // ========================
  // CHỌN CONVERSATION
  // ========================
  const handleSelect = (id) => {
    setSelectedId(id);
    setMobileView("chat");

    // Reset unread count cho conversation này ngay khi mở
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleBack = () => {
    setMobileView("list");
    setSelectedId(null);
  };

  // ========================
  // TỔNG SỐ TIN CHƯA ĐỌC (để show trên tab title)
  // ========================
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="h-screen flex flex-col">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Tin nhắn
          {totalUnread > 0 && (
            <span className="ml-2 text-sm font-semibold text-white bg-black dark:bg-white dark:text-black rounded-full px-2 py-0.5">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </h1>
        <button
          title="Cuộc trò chuyện mới"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>

      {/* ===== LAYOUT ===== */}
      <div className="flex flex-1 min-h-0">

        {/* ===== CONVERSATION LIST ===== */}
        {/* Desktop: luôn hiện | Mobile: chỉ hiện khi mobileView = "list" */}
        <div className={`
          flex-shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto
          w-full lg:w-80 xl:w-96
          ${mobileView === "chat" ? "hidden lg:flex lg:flex-col" : "flex flex-col"}
        `}>
          {loading ? (
            // Skeleton loading
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={handleSelect}
              onUpdate={handleConvUpdate}
              currentUserId={currentUser?.id}
            />
          )}
        </div>

        {/* ===== CHAT WINDOW ===== */}
        {/* Desktop: luôn hiện | Mobile: chỉ hiện khi mobileView = "chat" */}
        <div className={`
          flex-1 min-w-0 flex flex-col
          ${mobileView === "list" ? "hidden lg:flex" : "flex"}
        `}>
          {selectedConv ? (
            <ChatWindow
              key={selectedId} // Reset component khi đổi conversation
              conversationId={selectedId}
              otherUser={selectedConv.otherUser}
              currentUser={currentUser}
              onBack={handleBack}
            />
          ) : (
            // Empty state desktop
            <div className="hidden lg:flex flex-col items-center justify-center flex-1 text-center p-8">
              <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-300 dark:bg-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Tin nhắn của bạn</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                Chọn một cuộc trò chuyện bên trái hoặc nhắn tin với người dùng từ trang hồ sơ của họ.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

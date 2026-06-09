"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { useSocket } from "@/contexts/SocketContext";
import ConversationList from "@/components/messages/ConversationList";
import ChatWindow from "@/components/messages/ChatWindow";

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"

  // New chat modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const searchTimerRef = useRef(null);

  const router = useRouter();
  const currentUser = getCurrentUser();
  const socket = useSocket();

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
  }, [loadConversations]);

  // ========================
  // TÌM KIẾM USER (debounce 400ms)
  // ========================
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetchAPI(`/users/search?q=${encodeURIComponent(q.trim())}&limit=8`);
        if (res?.success) setSearchResults(res.data.users ?? res.data ?? []);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleStartNewChat = async (participantId) => {
    if (startingChat) return;
    setStartingChat(true);
    try {
      const res = await fetchAPI("/conversations", {
        method: "POST",
        body: JSON.stringify({ userId: participantId }),
      });
      if (res?.success) {
        setShowNewChat(false);
        setSearchQuery("");
        setSearchResults([]);
        // Reload danh sách và mở conversation mới
        await loadConversations();
        handleSelect(res.data.id);
      }
    } finally {
      setStartingChat(false);
    }
  };

  const closeNewChat = () => {
    setShowNewChat(false);
    setSearchQuery("");
    setSearchResults([]);
  };

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
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Tin nhắn
          {totalUnread > 0 && (
            <span className="ml-2 text-sm font-semibold text-white bg-black dark:bg-white dark:text-black rounded-full px-2 py-0.5">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </h1>
        <button
          onClick={() => setShowNewChat(true)}
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

      {/* ===== MODAL TẠO CUỘC TRÒ CHUYỆN MỚI ===== */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeNewChat} />

          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">Tin nhắn mới</h2>
              <button
                onClick={closeNewChat}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder="Tìm kiếm người dùng..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
                />
                {searching && (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Kết quả tìm kiếm */}
            <div className="max-h-64 overflow-y-auto">
              {searchResults.length === 0 && searchQuery.trim() && !searching ? (
                <p className="py-8 text-center text-sm text-gray-400">Không tìm thấy người dùng</p>
              ) : searchResults.length === 0 && !searchQuery.trim() ? (
                <p className="py-8 text-center text-sm text-gray-400">Nhập tên để tìm kiếm</p>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartNewChat(user.id)}
                    disabled={startingChat}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-sm font-bold">
                          {user.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

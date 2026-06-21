"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { fetchAPI } from "@/lib/api";
import { useSocket } from "@/contexts/SocketContext";
import MessageInput from "./MessageInput";
import { useLanguage } from "@/contexts/LanguageContext";

// Thời gian cho phép thu hồi tin nhắn (đồng bộ với backend: 5 phút)
const RECALL_WINDOW_MS = 5 * 60 * 1000;

// ========================
// HELPER: Nhóm tin theo ngày
// ========================
function getDateLabel(dateStr, todayLabel, yesterdayLabel) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return todayLabel;
    if (date.toDateString() === yesterday.toDateString()) return yesterdayLabel;
    return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function Avatar({ user, size = "w-8 h-8" }) {
    return (
        <div
            className={`${size} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0`}
        >
            {user?.avatar ? (
                <img
                    src={user.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                />
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
        <span
            className="text-[10px] ml-1 flex-shrink-0"
            title={isRead ? "Đã đọc" : "Đã gửi"}
        >
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
// KHỐI QUOTE TIN GỐC (hiển thị trong bubble của tin reply)
// ========================
// DM chỉ có 2 người → tin gốc của mình ("chính bạn") hoặc của otherUser.
// Bấm vào khối → scroll tới tin gốc (onJump). Tin đã thu hồi/không còn → "không khả dụng".
function QuoteBlock({ replyTo, isMine, otherUser, currentUser, onJump, t }) {
    const unavailable =
        replyTo.isRecalled || (!replyTo.content && !replyTo.mediaUrl);
    const origIsMine = replyTo.senderId === currentUser?.id;
    const name = origIsMine
        ? t("messages.yourself")
        : otherUser?.displayName || otherUser?.username || "";
    const preview = unavailable
        ? t("messages.messageUnavailable")
        : replyTo.mediaUrl && !replyTo.content
          ? t("messages.mediaMessage")
          : replyTo.content;

    return (
        <button
            type="button"
            onClick={unavailable ? undefined : onJump}
            className={`mb-1 max-w-[240px] text-left rounded-xl px-3 py-1.5 border-l-2 border-violet-400 dark:border-violet-500 bg-gray-100 dark:bg-gray-800/70 ${
                isMine ? "self-end" : "self-start"
            } ${
                unavailable
                    ? "cursor-default opacity-70"
                    : "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
            }`}
        >
            <p className="text-[11px] font-semibold text-violet-500 dark:text-violet-400 truncate">
                {name}
            </p>
            <p
                className={`text-xs truncate ${
                    unavailable
                        ? "italic text-gray-400 dark:text-gray-500"
                        : "text-gray-600 dark:text-gray-300"
                }`}
            >
                {preview}
            </p>
        </button>
    );
}

// ========================
// MENU HÀNH ĐỘNG TRÊN MỖI TIN NHẮN (Trả lời / Thu hồi / Xóa)
// ========================
// Nút 3 chấm: ẩn cho đến khi hover trên desktop, luôn hiện trên mobile (không có hover).
// "Thu hồi" chỉ hiện với tin của mình, chưa thu hồi và còn trong 5 phút (tính lại mỗi lần mở menu).
// Dropdown render qua portal (document.body) + position: fixed tính theo getBoundingClientRect
// của nút "..." — tránh bị khung messages (overflow-y-auto) cắt hoặc đẩy lệch vị trí.
const MENU_W = 160; // bề rộng menu (px) — dùng để canh không tràn mép màn hình
const MENU_H = 150; // chiều cao ước lượng — quyết định bung lên hay xuống

function MessageActions({ message, isMine, onReply, onRecall, onDelete, t }) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    const isRecalled = !!message.isRecalled;
    const canRecall =
        isMine &&
        !isRecalled &&
        Date.now() - new Date(message.createdAt).getTime() <= RECALL_WINDOW_MS;

    // Tính vị trí menu từ rect của nút "..." (toạ độ viewport vì dùng position: fixed)
    const computePosition = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Không đủ chỗ phía dưới → bung lên trên
        const openUp = rect.bottom + MENU_H > window.innerHeight;
        const style = { position: "fixed", zIndex: 50 };
        if (openUp) style.bottom = Math.round(window.innerHeight - rect.top + 6);
        else style.top = Math.round(rect.bottom + 6);
        // Tin của mình (bên phải) → canh mép phải nút; tin người khác → canh mép trái
        if (isMine) {
            style.right = Math.max(
                8,
                Math.round(window.innerWidth - rect.right),
            );
        } else {
            style.left = Math.min(
                Math.round(rect.left),
                window.innerWidth - MENU_W - 8,
            );
        }
        setMenuStyle(style);
    }, [isMine]);

    const toggle = () => {
        if (!open) computePosition();
        setOpen((v) => !v);
    };

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e) => {
            if (
                menuRef.current?.contains(e.target) ||
                triggerRef.current?.contains(e.target)
            ) {
                return;
            }
            setOpen(false);
        };
        // Đóng menu khi cuộn (capture=true để bắt cả scroll của khung messages) hoặc resize
        const onScrollResize = () => setOpen(false);
        document.addEventListener("mousedown", onDocClick);
        window.addEventListener("scroll", onScrollResize, true);
        window.addEventListener("resize", onScrollResize);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            window.removeEventListener("scroll", onScrollResize, true);
            window.removeEventListener("resize", onScrollResize);
        };
    }, [open]);

    const menu =
        open && menuStyle ? (
            <div
                ref={menuRef}
                style={menuStyle}
                className="min-w-[160px] py-1 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg text-sm"
            >
                {!isRecalled && (
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            onReply();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 17l-5-5 5-5" />
                            <path d="M4 12h11a5 5 0 015 5v1" />
                        </svg>
                        {t("messages.reply")}
                    </button>
                )}
                {canRecall && (
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            onRecall();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 7v6h6" />
                            <path d="M3 13a9 9 0 103-7.7L3 8" />
                        </svg>
                        {t("messages.recall")}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setOpen(false);
                        onDelete();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-9 0v14a2 2 0 002 2h6a2 2 0 002-2V6" />
                    </svg>
                    {t("messages.deleteForMe")}
                </button>
            </div>
        ) : null;

    return (
        <div className="self-center flex-shrink-0">
            <button
                ref={triggerRef}
                type="button"
                onClick={toggle}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-opacity ${
                    open
                        ? "opacity-100"
                        : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                }`}
                title={t("messages.reply")}
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="19" cy="12" r="1.6" />
                </svg>
            </button>

            {typeof document !== "undefined" && menu
                ? createPortal(menu, document.body)
                : null}
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
export default function ChatWindow({
    conversationId,
    otherUser,
    currentUser,
    onBack,
}) {
    const [messages, setMessages] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadingInit, setLoadingInit] = useState(true);
    const [typingUser, setTypingUser] = useState(null); // user đang gõ
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null); // tin đang trả lời
    const [highlightId, setHighlightId] = useState(null); // tin được highlight khi jump
    const { t } = useLanguage();

    const socket = useSocket();

    const messagesEndRef = useRef(null); // để scroll to bottom
    const containerRef = useRef(null); // container để detect scroll
    const socketRef = useRef(null);
    const prevScrollHeightRef = useRef(0); // giữ scroll position khi load more
    const messageRefs = useRef({}); // map messageId → DOM node (để scroll tới tin gốc)
    const highlightTimerRef = useRef(null);

    // ========================
    // ÁP DỤNG THU HỒI (dùng chung cho API success + socket event)
    // ========================
    // Đánh dấu tin bị thu hồi VÀ cập nhật mọi khối quote đang trỏ tới tin đó.
    const applyRecall = useCallback((messageId) => {
        setMessages((prev) =>
            prev.map((m) => {
                let nm = m;
                if (m.id === messageId) {
                    nm = {
                        ...nm,
                        isRecalled: true,
                        content: "",
                        mediaUrl: null,
                        mediaType: null,
                    };
                }
                if (m.replyTo?.id === messageId) {
                    nm = {
                        ...nm,
                        replyTo: {
                            ...nm.replyTo,
                            isRecalled: true,
                            content: "",
                            mediaUrl: null,
                            mediaType: null,
                        },
                    };
                }
                return nm;
            }),
        );
    }, []);

    // ========================
    // LOAD TIN NHẮN BAN ĐẦU
    // ========================
    const loadInitialMessages = useCallback(async () => {
        if (!conversationId) return;
        setLoadingInit(true);
        try {
            const data = await fetchAPI(
                `/conversations/${conversationId}/messages`,
            );
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
            const data = await fetchAPI(
                `/conversations/${conversationId}/messages?cursor=${nextCursor}`,
            );
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
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? "smooth" : "instant",
        });
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
        if (!conversationId || !socket) return;
        socketRef.current = socket;

        // Hàm join — dùng lại khi reconnect
        const joinConversation = () => {
            console.log(
                "[Chat] emit join_conversation",
                conversationId,
                "connected:",
                socket.connected,
            );
            socket.emit("join_conversation", { conversationId });
        };

        // Nếu socket đã connected → join ngay, nếu chưa → chờ event connect
        if (socket.connected) {
            joinConversation();
        }

        // Re-join sau khi reconnect
        socket.on("connect", joinConversation);

        // Nhận tin nhắn mới
        const handleNewMessage = (message) => {
            if (message.conversationId !== conversationId) return;
            if (message.senderId === currentUser?.id) return;
            setMessages((prev) => [...prev, message]);
            if (isAtBottom) setTimeout(() => scrollToBottom(true), 50);
        };

        const handleMessagesRead = ({ readBy }) => {
            if (readBy === currentUser?.id) return;
            setMessages((prev) =>
                prev.map((m) =>
                    m.senderId === currentUser?.id && !m.isRead
                        ? { ...m, isRead: true }
                        : m,
                ),
            );
        };

        const handleTyping = ({ userId }) => {
            if (userId !== currentUser?.id) setTypingUser(otherUser);
        };
        const handleStopTyping = () => setTypingUser(null);

        // Người kia thu hồi tin → cập nhật real-time thành placeholder
        const handleMessageRecalled = ({ conversationId: cid, messageId }) => {
            if (cid !== conversationId) return;
            applyRecall(messageId);
        };

        socket.on("new_message", handleNewMessage);
        socket.on("messages_read", handleMessagesRead);
        socket.on("user_typing", handleTyping);
        socket.on("user_stop_typing", handleStopTyping);
        socket.on("message_recalled", handleMessageRecalled);

        fetchAPI(`/conversations/${conversationId}/read`, {
            method: "PATCH",
        })
            .then(() => {
                // Báo Navbar refetch badge unread DM cho chính xác
                window.dispatchEvent(
                    new CustomEvent("dm-read", { detail: { conversationId } }),
                );
            })
            .catch(() => {});

        return () => {
            socket.emit("leave_conversation", { conversationId });
            socket.off("connect", joinConversation);
            socket.off("new_message", handleNewMessage);
            socket.off("messages_read", handleMessagesRead);
            socket.off("user_typing", handleTyping);
            socket.off("user_stop_typing", handleStopTyping);
            socket.off("message_recalled", handleMessageRecalled);
        };
    }, [conversationId, currentUser?.id, socket, applyRecall]);

    useEffect(() => {
        loadInitialMessages();
    }, [loadInitialMessages]);

    // ========================
    // GỬI TIN NHẮN (với optimistic update)
    // ========================
    const handleSend = async (content, mediaUrl, mediaType = null, replyToId = null) => {
        // Tạo optimistic message — hiển thị ngay trước khi API response
        const tempId = `temp_${Date.now()}`;
        // Snapshot tin gốc để hiển thị khối quote ngay (trước khi server trả về)
        const original = replyToId
            ? messages.find((m) => m.id === replyToId)
            : null;
        const optimistic = {
            id: tempId,
            content,
            mediaUrl,
            mediaType,
            senderId: currentUser.id,
            conversationId,
            createdAt: new Date().toISOString(),
            isRead: false,
            sender: currentUser,
            replyToId: replyToId || null,
            replyTo: original
                ? {
                      id: original.id,
                      content: original.content,
                      senderId: original.senderId,
                      mediaUrl: original.mediaUrl,
                      mediaType: original.mediaType,
                      isRecalled: !!original.isRecalled,
                  }
                : null,
            pending: true,
        };

        setMessages((prev) => [...prev, optimistic]);
        setTimeout(() => scrollToBottom(true), 50);

        try {
            const data = await fetchAPI(
                `/conversations/${conversationId}/messages`,
                {
                    method: "POST",
                    body: JSON.stringify({ content, mediaUrl, mediaType, replyToId }),
                },
            );

            // Thay thế optimistic message bằng real message từ server
            if (data?.success) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === tempId ? { ...data.data, pending: false } : m,
                    ),
                );
            } else {
                // Lỗi → đánh dấu failed
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === tempId
                            ? { ...m, failed: true, pending: false }
                            : m,
                    ),
                );
            }
        } catch (err) {
            // Lỗi (vd 403 giới hạn nhắn tin): bỏ optimistic message và ném lại
            // để MessageInput khôi phục nội dung đã gõ + hiện thông báo
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            throw err;
        }
    };

    // ========================
    // TRẢ LỜI / THU HỒI / XÓA
    // ========================
    const handleReply = (message) => setReplyingTo(message);

    // Thu hồi tin nhắn của mình — không optimistic để tránh mất nội dung nếu lỗi
    const handleRecall = async (messageId) => {
        try {
            await fetchAPI(`/conversations/messages/${messageId}/recall`, {
                method: "PATCH",
            });
            applyRecall(messageId); // socket cũng sẽ tới phía người kia
        } catch (err) {
            toast.error(err?.message || t("messages.failed"));
        }
    };

    // Xóa tin chỉ ở phía mình — optimistic, khôi phục nếu API lỗi
    const handleDelete = async (messageId) => {
        if (
            typeof window !== "undefined" &&
            !window.confirm(t("messages.deleteConfirm"))
        ) {
            return;
        }
        const removed = messages.find((m) => m.id === messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));

        // Tin optimistic (chưa có trên server) → chỉ cần ẩn local
        if (!removed || removed.pending || String(messageId).startsWith("temp_")) {
            return;
        }
        try {
            await fetchAPI(`/conversations/messages/${messageId}`, {
                method: "DELETE",
            });
        } catch (err) {
            toast.error(err?.message || t("messages.failed"));
            // Khôi phục lại đúng vị trí theo thời gian
            setMessages((prev) =>
                [...prev, removed].sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
                ),
            );
        }
    };

    // Scroll tới tin nhắn gốc + highlight tạm thời (nếu còn trong danh sách)
    const scrollToMessage = (messageId) => {
        const el = messageRefs.current[messageId];
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(messageId);
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => setHighlightId(null), 1600);
    };

    // Dọn timer highlight khi unmount
    useEffect(() => () => clearTimeout(highlightTimerRef.current), []);

    // ========================
    // NHÓM TIN NHẮN THEO NGÀY
    // ========================
    const groupedMessages = [];
    let lastDateLabel = null;

    for (const msg of messages) {
        const label = getDateLabel(
            msg.createdAt,
            t("messages.today"),
            t("messages.yesterday"),
        );
        if (label !== lastDateLabel) {
            groupedMessages.push({
                type: "date_divider",
                label,
                id: `divider_${msg.id}`,
            });
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
                    <svg
                        className="w-10 h-10 text-gray-300 dark:text-gray-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                    {t("messages.selectConversation")}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    {t("messages.startChat")}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* ===== HEADER ===== */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
                {/* Nút back — chỉ hiện trên mobile */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 lg:hidden"
                    >
                        <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                )}
                <Avatar user={otherUser} size="w-9 h-9" />
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {otherUser.displayName || otherUser.username}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        @{otherUser.username}
                    </p>
                </div>
            </div>

            {/* ===== MESSAGE LIST ===== */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-white dark:bg-gray-950 scrollbar-thin"
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
                            <div
                                key={i}
                                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                            >
                                <div
                                    className="h-8 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"
                                    style={{ width: `${120 + i * 30}px` }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Grouped messages */}
                {!loadingInit &&
                    groupedMessages.map((item) => {
                        if (item.type === "date_divider") {
                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 py-3"
                                >
                                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">
                                        {item.label}
                                    </span>
                                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                                </div>
                            );
                        }

                        const isMine = item.senderId === currentUser?.id;
                        const showActions = !item.pending && !item.failed;
                        const actions = showActions ? (
                            <MessageActions
                                message={item}
                                isMine={isMine}
                                onReply={() => handleReply(item)}
                                onRecall={() => handleRecall(item.id)}
                                onDelete={() => handleDelete(item.id)}
                                t={t}
                            />
                        ) : null;

                        return (
                            <div
                                key={item.id}
                                ref={(el) => {
                                    if (el) messageRefs.current[item.id] = el;
                                    else delete messageRefs.current[item.id];
                                }}
                                data-message-id={item.id}
                                className={`group relative flex items-end gap-2 rounded-2xl px-1 -mx-1 transition-colors duration-500 ${
                                    isMine ? "justify-end pr-2" : "justify-start pl-2"
                                } ${
                                    highlightId === item.id
                                        ? "bg-violet-100/70 dark:bg-violet-500/15"
                                        : ""
                                }`}
                            >
                                {/* Avatar người kia — chỉ hiện bên trái */}
                                {!isMine && (
                                    <Avatar user={otherUser} size="w-7 h-7" />
                                )}

                                {/* Menu hành động — bên trái bong bóng của mình */}
                                {isMine && actions}

                                <div
                                    className={`flex flex-col min-w-0 ${isMine ? "items-end" : "items-start"} max-w-[70%]`}
                                >
                                    {/* Khối quote tin nhắn gốc (nếu là reply) */}
                                    {item.replyTo && (
                                        <QuoteBlock
                                            replyTo={item.replyTo}
                                            isMine={isMine}
                                            otherUser={otherUser}
                                            currentUser={currentUser}
                                            onJump={() =>
                                                scrollToMessage(item.replyTo.id)
                                            }
                                            t={t}
                                        />
                                    )}

                                    {item.isRecalled ? (
                                        /* Placeholder tin đã thu hồi */
                                        <div className="px-4 py-2.5 rounded-2xl text-sm italic text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                            {t("messages.recalledMessage")}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Media đính kèm: ảnh, video hoặc tin nhắn thoại */}
                                            {item.mediaUrl &&
                                                (item.mediaType === "audio" ? (
                                                    <audio
                                                        src={item.mediaUrl}
                                                        controls
                                                        className={`mb-1 h-10 max-w-[240px] rounded-full ${
                                                            item.pending
                                                                ? "opacity-60"
                                                                : ""
                                                        }`}
                                                    />
                                                ) : item.mediaType === "video" ? (
                                                    <video
                                                        src={item.mediaUrl}
                                                        controls
                                                        playsInline
                                                        className={`rounded-2xl max-w-[240px] mb-1 ${
                                                            item.pending
                                                                ? "opacity-60"
                                                                : ""
                                                        }`}
                                                    />
                                                ) : (
                                                    // "image" hoặc fallback khi không có mediaType
                                                    <img
                                                        src={item.mediaUrl}
                                                        alt="attachment"
                                                        className={`rounded-2xl max-w-[240px] mb-1 cursor-pointer hover:opacity-95 ${
                                                            item.pending
                                                                ? "opacity-60"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            window.open(
                                                                item.mediaUrl,
                                                                "_blank",
                                                            )
                                                        }
                                                    />
                                                ))}

                                            {/* Nội dung text */}
                                            {item.content && (
                                                <div
                                                    className={`max-w-full px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                                        isMine
                                                            ? "bg-black text-white rounded-br-none dark:bg-violet-600 dark:text-white"
                                                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
                                                    } ${item.pending ? "opacity-60" : ""} ${item.failed ? "border border-red-300" : ""}`}
                                                >
                                                    {item.content}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Thời gian + read receipt */}
                                    <div
                                        className={`flex items-center gap-1 mt-0.5 ${isMine ? "flex-row-reverse" : ""}`}
                                    >
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                            {item.failed
                                                ? t("messages.failed")
                                                : item.pending
                                                  ? t("messages.sending")
                                                  : formatTime(item.createdAt)}
                                        </span>
                                        {isMine &&
                                            !item.pending &&
                                            !item.failed &&
                                            !item.isRecalled && (
                                                <ReadReceipt
                                                    isSent={true}
                                                    isRead={item.isRead}
                                                />
                                            )}
                                    </div>
                                </div>

                                {/* Menu hành động — bên phải bong bóng người kia */}
                                {!isMine && actions}
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
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                currentUser={currentUser}
            />
        </div>
    );
}

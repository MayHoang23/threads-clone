"use client";

import { useState, useRef, useEffect } from "react";
import { getSocket } from "@/lib/socket";

// Props:
//   onSend(content, mediaUrl): callback khi gửi
//   conversationId: string
//   disabled: boolean
const STOP_TYPING_DELAY = 2000; // ms

export default function MessageInput({
    onSend,
    conversationId,
    disabled = false,
}) {
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);
    const textareaRef = useRef(null);
    const stopTypingTimerRef = useRef(null);
    const isTypingRef = useRef(false); // track trạng thái typing đã emit chưa

    // Tự resize textarea khi nội dung thay đổi
    const resizeTextarea = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "24px";
        ta.style.height = `${ta.scrollHeight}px`;
        if (ta.scrollHeight > 120) {
            ta.style.height = "120px";
            ta.style.overflowY = "auto";
        } else {
            ta.style.overflowY = "hidden";
        }
    };

    const emitTyping = () => {
        const socket = getSocket();
        if (!socket || !conversationId) return;

        // Chỉ emit "typing" khi chưa emit (tránh spam)
        if (!isTypingRef.current) {
            socket.emit("typing", { conversationId });
            isTypingRef.current = true;
        }

        // Reset timer: sau 2s ngừng gõ thì emit "stop_typing"
        clearTimeout(stopTypingTimerRef.current);
        stopTypingTimerRef.current = setTimeout(() => {
            socket.emit("stop_typing", { conversationId });
            isTypingRef.current = false;
        }, STOP_TYPING_DELAY);
    };

    const handleChange = (e) => {
        setContent(e.target.value);
        if (e.target.value.trim()) emitTyping();
    };

    // Resize sau mỗi lần content thay đổi (sau render)
    useEffect(() => {
        resizeTextarea();
    }, [content]);

    const handleSend = async () => {
        const trimmed = content.trim();
        if (!trimmed || sending || disabled) return;

        // Dừng typing indicator ngay khi gửi
        clearTimeout(stopTypingTimerRef.current);
        const socket = getSocket();
        if (socket && isTypingRef.current) {
            socket.emit("stop_typing", { conversationId });
            isTypingRef.current = false;
        }

        setSending(true);
        const sentContent = trimmed;
        setContent(""); // Reset ngay (optimistic)
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        try {
            await onSend(sentContent, null);
        } catch {
            // Nếu lỗi → khôi phục nội dung
            setContent(sentContent);
        } finally {
            setSending(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        // Enter gửi, Shift+Enter xuống dòng
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Cleanup timer khi unmount
    useEffect(() => {
        return () => {
            clearTimeout(stopTypingTimerRef.current);
            const socket = getSocket();
            if (socket && isTypingRef.current && conversationId) {
                socket.emit("stop_typing", { conversationId });
            }
        };
    }, [conversationId]);

    const canSend = content.trim().length > 0 && !sending && !disabled;

    return (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3">
            <div className="flex items-end gap-3">
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 flex items-end gap-2 min-h-[40px]">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập tin nhắn..."
                        rows={1}
                        disabled={disabled}
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none leading-relaxed w-full"
                        style={{
                            height: "24px",
                            maxHeight: "120px",
                            overflowY: "hidden",
                        }}
                    />
                </div>

                {/* Nút gửi */}
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed bg-black dark:bg-white text-white dark:text-black"
                >
                    {sending ? (
                        <svg
                            className="animate-spin w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                            />
                        </svg>
                    ) : (
                        <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

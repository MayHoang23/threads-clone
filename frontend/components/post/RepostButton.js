"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import QuoteModal from "./QuoteModal";

// Icon repeat (dùng cho nút + item menu)
function RepeatIcon({ className = "w-[22px] h-[22px]" }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
        </svg>
    );
}

// Nút repost: bấm mở dropdown Repost / Bỏ repost / Quote post.
// post = bài gốc (effective original) cần thao tác.
// onUnrepost = callback khi bỏ repost thành công (dùng để gỡ thẻ repost khỏi feed).
export default function RepostButton({ post, currentUser, onUnrepost }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [showQuote, setShowQuote] = useState(false);
    const [reposted, setReposted] = useState(!!post.isRepostedByMe);
    const [count, setCount] = useState(post.repostCount || 0);
    const [busy, setBusy] = useState(false);

    const isOwnPost = currentUser?.id === post.author?.id;

    // Sync lại khi post prop thay đổi từ bên ngoài (PostCard update state)
    useEffect(() => {
        setReposted(!!post.isRepostedByMe);
        setCount(post.repostCount || 0);
    }, [post.isRepostedByMe, post.repostCount]);

    const handleRepost = async () => {
        setOpen(false);
        if (busy) return;
        setBusy(true);
        setReposted(true);
        setCount((c) => c + 1);
        try {
            const data = await fetchAPI(`/posts/${post.id}/repost`, {
                method: "POST",
            });
            if (data?.success) {
                window.dispatchEvent(
                    new CustomEvent("post-created", { detail: data.data }),
                );
                window.dispatchEvent(
                    new CustomEvent("repost-changed", {
                        detail: { postId: post.id, isReposted: true },
                    }),
                );
            }
        } catch {
            setReposted(false);
            setCount((c) => Math.max(0, c - 1));
        } finally {
            setBusy(false);
        }
    };

    const handleUnrepost = async () => {
        setOpen(false);
        if (busy) return;
        setBusy(true);
        try {
            await fetchAPI(`/posts/${post.id}/repost`, { method: "DELETE" });
            setReposted(false);
            setCount((c) => Math.max(0, c - 1));
            window.dispatchEvent(
                new CustomEvent("repost-changed", {
                    detail: { postId: post.id, isReposted: false },
                }),
            );
            onUnrepost?.(false);
        } catch {
            // giữ nguyên
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {/* Overlay đóng menu khi click ra ngoài */}
            {open && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpen(false)}
                />
            )}

            <div className="relative z-20">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                    <RepeatIcon
                        className={`w-[22px] h-[22px] transition-colors ${
                            reposted
                                ? "text-green-500"
                                : "text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200"
                        }`}
                    />
                    {count > 0 && (
                        <span
                            className={`text-xs font-medium ${reposted ? "text-green-500" : "text-gray-500 dark:text-gray-400"}`}
                        >
                            {count}
                        </span>
                    )}
                </button>

                {open && (
                    <div className="absolute left-0 top-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden min-w-[180px] text-sm">
                        {/* Không cho repost bài của chính mình */}
                        {!isOwnPost &&
                            (reposted ? (
                                <button
                                    onClick={handleUnrepost}
                                    className="w-full flex items-center gap-2.5 text-left px-4 py-3 font-medium text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <RepeatIcon className="w-[18px] h-[18px]" />
                                    {t("post.undoRepost")}
                                </button>
                            ) : (
                                <button
                                    onClick={handleRepost}
                                    className="w-full flex items-center gap-2.5 text-left px-4 py-3 font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <RepeatIcon className="w-[18px] h-[18px]" />
                                    {t("post.repost")}
                                </button>
                            ))}

                        <button
                            onClick={() => {
                                setOpen(false);
                                setShowQuote(true);
                            }}
                            className="w-full flex items-center gap-2.5 text-left px-4 py-3 font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <svg
                                className="w-[18px] h-[18px]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                <line x1="8" y1="9" x2="16" y2="9" />
                                <line x1="8" y1="13" x2="13" y2="13" />
                            </svg>
                            {t("post.quote")}
                        </button>
                    </div>
                )}
            </div>

            {showQuote && (
                <QuoteModal
                    post={post}
                    currentUser={currentUser}
                    onClose={() => setShowQuote(false)}
                />
            )}
        </>
    );
}

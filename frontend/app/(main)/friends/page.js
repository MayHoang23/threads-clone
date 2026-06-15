"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import UserCard from "@/components/user/UserCard";
import { useLanguage } from "@/contexts/LanguageContext";

// Skeleton cho 1 người dùng
function UserSkeleton() {
    return (
        <div className="flex items-center px-4 py-3 gap-3 animate-pulse">
            <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-28" />
                <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded-full" />
        </div>
    );
}

// Card cho 1 lời mời kết bạn
function FriendRequestCard({ request, onRespond, t }) {
    const [loading, setLoading] = useState(null); // "accept" | "reject" | null

    const handleRespond = async (action) => {
        if (loading) return;
        setLoading(action);
        try {
            const res = await fetchAPI(`/users/friend-request/${request.id}`, {
                method: "PUT",
                body: JSON.stringify({ action }),
            });
            if (res?.success) {
                onRespond(request.id, action);
            }
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <Link
                href={`/profile/${request.requester.username}`}
                className="flex items-center gap-3 flex-1 min-w-0"
            >
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                    {request.requester.avatar ? (
                        <img
                            src={request.requester.avatar}
                            alt={request.requester.username}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-base">
                            {request.requester.username?.[0]?.toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                            {request.requester.displayName ||
                                request.requester.username}
                        </span>
                        {request.requester.isVerified && (
                            <svg
                                className="w-3.5 h-3.5 text-blue-500 flex-shrink-0"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.45 4.506 3.745 3.745 0 01-4.506.45A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-4.506-.45 3.745 3.745 0 01-.45-4.506A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.45-4.506 3.745 3.745 0 014.506-.45A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 014.506.45 3.745 3.745 0 01.45 4.506A3.745 3.745 0 0121 12z" />
                            </svg>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">
                        @{request.requester.username}
                    </span>
                </div>
            </Link>

            {/* Nút chấp nhận / từ chối */}
            <div className="flex gap-2 ml-3 flex-shrink-0">
                <button
                    onClick={() => handleRespond("accept")}
                    disabled={!!loading}
                    className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center gap-1"
                >
                    {loading === "accept" ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        t("friends.accept")
                    )}
                </button>
                <button
                    onClick={() => handleRespond("reject")}
                    disabled={!!loading}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded-full hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1"
                >
                    {loading === "reject" ? (
                        <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        t("friends.decline")
                    )}
                </button>
            </div>
        </div>
    );
}

export default function FriendsPage() {
    const currentUser = getCurrentUser();
    const { t } = useLanguage();
    const TABS = [
        { key: "requests", label: t("friends.requests") },
        { key: "friends", label: t("friends.friends") },
        { key: "suggestions", label: t("friends.suggestions") },
    ];
    const [activeTab, setActiveTab] = useState("requests");
    const [requests, setRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load dữ liệu theo tab đang chọn (lazy load)
    useEffect(() => {
        loadTabData(activeTab);
    }, [activeTab]);

    const loadTabData = async (tab) => {
        setLoading(true);
        try {
            if (tab === "requests") {
                const res = await fetchAPI("/users/friend-requests");
                if (res?.success) setRequests(res.data);
            } else if (tab === "friends") {
                // Lấy danh sách bạn bè = following của mình mà cũng follow lại mình
                // (đơn giản: lấy following của mình)
                const res = await fetchAPI(
                    `/users/${currentUser?.username}/following`,
                );
                if (res?.success)
                    setFriends(
                        res.data.map((u) => ({ ...u, isFollowing: true })),
                    );
            } else if (tab === "suggestions") {
                await loadSuggestions();
            }
        } finally {
            setLoading(false);
        }
    };

    // Gợi ý kết bạn: lấy following của những người mình đang follow (bạn của bạn)
    const loadSuggestions = async () => {
        if (!currentUser?.username) return;

        // Bước 1: lấy danh sách mình đang follow
        const followingRes = await fetchAPI(
            `/users/${currentUser.username}/following`,
        );
        if (!followingRes?.success) return;

        const myFollowingIds = new Set(followingRes.data.map((u) => u.id));
        myFollowingIds.add(currentUser.id); // thêm chính mình để loại trừ

        // Bước 2: lấy following của mỗi người mình follow (tối đa 3 người để tránh quá nhiều request)
        const candidateMap = new Map();
        const targets = followingRes.data.slice(0, 3);

        await Promise.all(
            targets.map(async (followedUser) => {
                const res = await fetchAPI(
                    `/users/${followedUser.username}/following`,
                );
                if (res?.success) {
                    res.data.forEach((u) => {
                        // Chỉ gợi ý người mình chưa follow và không phải chính mình
                        if (!myFollowingIds.has(u.id)) {
                            candidateMap.set(u.id, u);
                        }
                    });
                }
            }),
        );

        setSuggestions(
            Array.from(candidateMap.values())
                .slice(0, 10)
                .map((u) => ({ ...u, isFollowing: false })),
        );
    };

    const handleFollowChange = (username, isFollowing) => {
        setFriends((prev) =>
            prev.map((u) =>
                u.username === username ? { ...u, isFollowing } : u,
            ),
        );
        setSuggestions((prev) =>
            prev.map((u) =>
                u.username === username ? { ...u, isFollowing } : u,
            ),
        );
    };

    // Sync follow state cross-page
    useEffect(() => {
        const handler = (e) => {
            const { username, isFollowing } = e.detail;
            setFriends((prev) =>
                prev.map((u) =>
                    u.username === username ? { ...u, isFollowing } : u,
                ),
            );
            setSuggestions((prev) =>
                prev.map((u) =>
                    u.username === username ? { ...u, isFollowing } : u,
                ),
            );
        };
        window.addEventListener("follow-changed", handler);
        return () => window.removeEventListener("follow-changed", handler);
    }, []);

    // Khi respond lời mời → xóa khỏi danh sách
    const handleRespond = (requestId) => {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
    };

    return (
        <div>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
                <div className="px-4 py-3">
                    <h1 className="font-bold text-lg">{t("friends.title")}</h1>
                </div>
                {/* Tabs */}
                <div className="flex">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative ${
                                activeTab === tab.key
                                    ? "text-black dark:text-white"
                                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            }`}
                        >
                            {tab.label}
                            {/* Badge số lượng lời mời */}
                            {tab.key === "requests" && requests.length > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                    {requests.length > 9
                                        ? "9+"
                                        : requests.length}
                                </span>
                            )}
                            {activeTab === tab.key && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <UserSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* ===== TAB: LỜI MỜI ===== */}
            {!loading && activeTab === "requests" && (
                <>
                    {requests.length === 0 ? (
                        <div className="py-20 text-center px-6">
                            <div className="text-5xl mb-4">📭</div>
                            <p className="text-sm text-gray-400">
                                {t("friends.noRequests")}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="px-4 pt-4 pb-2 text-xs text-gray-400">
                                {requests.length} {t("friends.requestCount")}
                            </p>
                            {requests.map((req) => (
                                <FriendRequestCard
                                    key={req.id}
                                    request={req}
                                    onRespond={handleRespond}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ===== TAB: BẠN BÈ (following) ===== */}
            {!loading && activeTab === "friends" && (
                <>
                    {friends.length === 0 ? (
                        <div className="py-20 text-center px-6">
                            <div className="text-5xl mb-4">👥</div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                {t("friends.noFriends")}
                            </p>
                            <p className="text-sm text-gray-400">
                                {t("friends.noFriendsDesc")}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {friends.map((user) => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    currentUserId={currentUser?.id}
                                    onFollowChange={handleFollowChange}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ===== TAB: GỢI Ý ===== */}
            {!loading && activeTab === "suggestions" && (
                <>
                    {suggestions.length === 0 ? (
                        <div className="py-20 text-center px-6">
                            <div className="text-5xl mb-4">🌟</div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                {t("friends.noSuggestions")}
                            </p>
                            <p className="text-sm text-gray-400">
                                {t("friends.noSuggestionsDesc")}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="px-4 pt-4 pb-2 text-xs text-gray-400">
                                {t("friends.friendsOfFriends")}
                            </p>
                            <div className="divide-y divide-gray-50">
                                {suggestions.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        currentUserId={currentUser?.id}
                                        onFollowChange={handleFollowChange}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

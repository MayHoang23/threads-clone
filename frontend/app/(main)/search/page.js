"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import PostCard from "@/components/post/PostCard";
import UserCard from "@/components/user/UserCard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SearchPage() {
    const currentUser = getCurrentUser();
    const { t } = useLanguage();

    const TABS = [
        { key: "all", label: t("search.all") },
        { key: "users", label: t("search.users") },
        { key: "posts", label: t("search.posts") },
        { key: "hashtags", label: t("search.hashtags") },
    ];

    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [results, setResults] = useState({
        users: [],
        posts: [],
        hashtags: [],
    });
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false); // true sau lần tìm đầu tiên
    const debounceTimer = useRef(null);
    const inputRef = useRef(null);

    // Focus ô tìm kiếm khi vào trang
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Sync follow state cross-page
    useEffect(() => {
        const handler = (e) => {
            const { username, isFollowing } = e.detail;
            setResults((prev) => ({
                ...prev,
                users: prev.users.map((u) =>
                    u.username === username ? { ...u, isFollowing } : u,
                ),
            }));
        };
        window.addEventListener("follow-changed", handler);
        return () => window.removeEventListener("follow-changed", handler);
    }, []);

    // Debounce 500ms: chờ người dùng ngừng gõ mới gọi API
    useEffect(() => {
        if (!query.trim()) {
            setResults({ users: [], posts: [], hashtags: [] });
            setSearched(false);
            return;
        }

        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            doSearch(query.trim());
        }, 500);

        return () => clearTimeout(debounceTimer.current);
    }, [query]);

    const doSearch = async (q) => {
        setLoading(true);
        try {
            const res = await fetchAPI(
                `/users/search?q=${encodeURIComponent(q)}`,
            );
            if (res?.success) {
                setResults(res.data);
                setSearched(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFollowChange = (username, isFollowing) => {
        setResults((prev) => ({
            ...prev,
            users: prev.users.map((u) =>
                u.username === username ? { ...u, isFollowing } : u,
            ),
        }));
    };

    const handleClear = () => {
        setQuery("");
        setResults({ users: [], posts: [], hashtags: [] });
        setSearched(false);
        inputRef.current?.focus();
    };

    // Lọc kết quả theo tab đang chọn
    const hasResults =
        results.users.length > 0 ||
        results.posts.length > 0 ||
        results.hashtags.length > 0;

    const showUsers = activeTab === "all" || activeTab === "users";
    const showPosts = activeTab === "all" || activeTab === "posts";
    const showHashtags = activeTab === "all" || activeTab === "hashtags";

    return (
        <div>
            {/* ===== SEARCH INPUT ===== */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("search.placeholder")}
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-all"
                    />
                    {/* Nút xóa — chỉ hiện khi đang có query */}
                    {query && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center hover:bg-gray-500 transition-colors"
                        >
                            <svg
                                className="w-3 h-3 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* ===== TABS — chỉ hiện khi đã có kết quả ===== */}
            {searched && (
                <div className="flex border-b border-gray-100 dark:border-gray-800 sticky top-[61px] z-10 bg-white dark:bg-gray-950">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${
                                activeTab === tab.key
                                    ? "border-b-2 border-black dark:border-white text-black dark:text-white"
                                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ===== LOADING ===== */}
            {loading && (
                <div className="py-16 flex justify-center">
                    <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                </div>
            )}

            {/* ===== EMPTY STATE ===== */}
            {!loading && searched && !hasResults && (
                <div className="py-20 text-center px-6">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="font-semibold text-gray-700 mb-1">
                        {t("search.noResults")}
                    </p>
                    <p className="text-sm text-gray-400">
                        {t("search.noResultsDesc")}
                    </p>
                </div>
            )}

            {/* ===== PLACEHOLDER KHI CHƯA TÌM ===== */}
            {!loading && !searched && !query && (
                <div className="py-20 text-center px-6">
                    <div className="text-5xl mb-4">✨</div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        {t("search.typeToSearch")}
                    </p>
                </div>
            )}

            {/* ===== KẾT QUẢ ===== */}
            {!loading && hasResults && (
                <div>
                    {/* --- Người dùng --- */}
                    {showUsers && results.users.length > 0 && (
                        <section>
                            {activeTab === "all" && (
                                <div className="px-4 pt-4 pb-2">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        {t("search.users")}
                                    </h2>
                                </div>
                            )}
                            <div className="divide-y divide-gray-50">
                                {results.users.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        currentUserId={currentUser?.id}
                                        onFollowChange={handleFollowChange}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* --- Bài viết --- */}
                    {showPosts && results.posts.length > 0 && (
                        <section>
                            {activeTab === "all" && (
                                <div className="px-4 pt-4 pb-2 border-t border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        {t("search.posts")}
                                    </h2>
                                </div>
                            )}
                            {results.posts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    currentUser={currentUser}
                                />
                            ))}
                        </section>
                    )}

                    {/* --- Hashtag --- */}
                    {showHashtags && results.hashtags.length > 0 && (
                        <section>
                            {activeTab === "all" && (
                                <div className="px-4 pt-4 pb-2 border-t border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        {t("search.hashtags")}
                                    </h2>
                                </div>
                            )}
                            <div className="divide-y divide-gray-50">
                                {results.hashtags.map((tag) => (
                                    <div
                                        key={tag.name}
                                        className="flex items-center justify-between px-4 py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Icon hashtag */}
                                            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-gray-600 font-bold text-lg">
                                                    #
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                    #{tag.name}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {tag.postCount} bài viết
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Empty state cho tab cụ thể */}
                    {activeTab === "users" && results.users.length === 0 && (
                        <div className="py-16 text-center text-sm text-gray-400">
                            {t("search.noUsers")}
                        </div>
                    )}
                    {activeTab === "posts" && results.posts.length === 0 && (
                        <div className="py-16 text-center text-sm text-gray-400">
                            {t("search.noPosts")}
                        </div>
                    )}
                    {activeTab === "hashtags" &&
                        results.hashtags.length === 0 && (
                            <div className="py-16 text-center text-sm text-gray-400">
                                {t("search.noHashtags")}
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}

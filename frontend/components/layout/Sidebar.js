"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

// Fallback tĩnh khi API suggestions fail / rỗng
const FALLBACK_USERS = [
    {
        username: "design.daily",
        displayName: "Design Daily",
        gradient: "from-orange-400 to-pink-500",
        followers: "24.1K",
        isFollowing: false,
    },
    {
        username: "code.journey",
        displayName: "Code Journey",
        gradient: "from-blue-400 to-indigo-500",
        followers: "11.8K",
        isFollowing: false,
    },
    {
        username: "photo.vibes",
        displayName: "Photo Vibes",
        gradient: "from-green-400 to-teal-500",
        followers: "48.3K",
        isFollowing: false,
    },
];

// Dựng object followStates { [username]: isFollowing } từ danh sách user
const buildFollowStates = (users) => {
    const states = {};
    users.forEach((u) => {
        states[u.username] = u.isFollowing;
    });
    return states;
};

// Fallback tĩnh khi API trending fail
const TRENDING_TAGS = [
    { name: "threads", count: "125K bài" },
    { name: "nextjs14", count: "43K bài" },
    { name: "design", count: "89K bài" },
    { name: "saigon", count: "234K bài" },
    { name: "photography", count: "512K bài" },
];

export default function Sidebar() {
    const { t } = useLanguage();

    // Khởi tạo = FALLBACK_USERS để hiện ngay khi load, trước khi API về
    const [suggestedUsers, setSuggestedUsers] = useState(FALLBACK_USERS);
    const [trendingTags, setTrendingTags] = useState(null); // null = đang load
    // Trạng thái follow theo username (optimistic)
    const [followStates, setFollowStates] = useState(() =>
        buildFollowStates(FALLBACK_USERS),
    );

    // Fetch gợi ý người theo dõi
    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const data = await fetchAPI("/users/suggestions");
                if (data?.success && data.data.length > 0) {
                    // API thành công và có dữ liệu → dùng data thật
                    setSuggestedUsers(data.data);
                    setFollowStates(buildFollowStates(data.data));
                } else {
                    // API trả rỗng → fallback tĩnh
                    setSuggestedUsers(FALLBACK_USERS);
                    setFollowStates(buildFollowStates(FALLBACK_USERS));
                }
            } catch {
                // API fail → fallback tĩnh
                setSuggestedUsers(FALLBACK_USERS);
                setFollowStates(buildFollowStates(FALLBACK_USERS));
            }
        };
        fetchSuggestions();
    }, []);

    // Fetch hashtag đang hot
    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const data = await fetchAPI("/posts/trending-hashtags");
                if (data?.success && data.data.length > 0) {
                    setTrendingTags(data.data);
                } else {
                    setTrendingTags([]);
                }
            } catch {
                setTrendingTags([]);
            }
        };
        fetchTrending();
    }, []);

    return (
        <div className="space-y-8 pt-2">
            {/* Gợi ý người theo dõi */}
            {suggestedUsers.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                        {t("sidebar.suggestions")}
                    </h3>
                    <div className="space-y-4">
                        {suggestedUsers.map((user) => {
                            const isFollowing = followStates[user.username];
                            return (
                                <div
                                    key={user.username}
                                    className="flex items-center gap-3"
                                >
                                    {/* Avatar + tên → link tới profile */}
                                    <Link
                                        href={`/profile/${user.username}`}
                                        className="flex items-center gap-3 flex-1 min-w-0 group"
                                    >
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.username}
                                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {user.username[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:underline">
                                                {user.username}
                                            </p>
                                            {user.displayName && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                    {user.displayName}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                    {/* Nút follow với optimistic update */}
                                    <button
                                        onClick={async () => {
                                            const was =
                                                followStates[user.username];
                                            setFollowStates((prev) => ({
                                                ...prev,
                                                [user.username]: !was,
                                            }));
                                            try {
                                                await fetchAPI(
                                                    `/users/${user.username}/follow`,
                                                    { method: "POST" },
                                                );
                                            } catch {
                                                setFollowStates((prev) => ({
                                                    ...prev,
                                                    [user.username]: was,
                                                }));
                                            }
                                        }}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex-shrink-0 ${
                                            isFollowing
                                                ? "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
                                        }`}
                                    >
                                        {isFollowing
                                            ? t("sidebar.following")
                                            : t("sidebar.follow")}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <Link
                        href="/friends"
                        className="inline-block mt-3 text-xs text-blue-500 hover:underline font-medium"
                    >
                        {t("sidebar.seeMore")}
                    </Link>
                </div>
            )}

            {/* Hashtag đang trending */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    {t("sidebar.trending")}
                </h3>
                <div className="space-y-3">
                    {trendingTags === null
                        ? // Skeleton loading
                          [...Array(5)].map((_, i) => (
                              <div
                                  key={i}
                                  className="flex items-center justify-between animate-pulse"
                              >
                                  <div className="space-y-1.5">
                                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-24" />
                                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
                                  </div>
                                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full w-6" />
                              </div>
                          ))
                        : trendingTags.length === 0
                          ? null
                          : trendingTags.map((tag, i) => (
                                <Link
                                    key={tag.name}
                                    href={`/search?q=%23${tag.name}`}
                                    className="flex items-center justify-between group"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-500 transition-colors">
                                            #{tag.name}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {tag.postCount != null
                                                ? `${tag.postCount} bài`
                                                : tag.count}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-300 dark:text-gray-600">
                                        #{i + 1}
                                    </span>
                                </Link>
                            ))}
                </div>
            </div>

            {/* Footer links nhỏ */}
            <div className="text-xs text-gray-400 dark:text-gray-500 space-y-2 pb-4">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {[
                        "Điều khoản",
                        "Quyền riêng tư",
                        "Cookies",
                        "Trợ giúp",
                        "Giới thiệu",
                        "Nghề nghiệp",
                    ].map((item) => (
                        <span
                            key={item}
                            className="hover:text-gray-600 dark:hover:text-gray-400 cursor-pointer transition-colors"
                        >
                            {item}
                        </span>
                    ))}
                </div>
                <p className="text-gray-300 dark:text-gray-600">
                    © 2025 Threads Clone · Được tạo bởi Machine Hoàng
                </p>
            </div>
        </div>
    );
}

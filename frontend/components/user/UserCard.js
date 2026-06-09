"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";

export default function UserCard({ user: initialUser, currentUserId, showFollowButton = true, onFollowChange }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);

  // Sync khi initialUser.isFollowing thay đổi từ parent
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser.isFollowing]);

  const isOwnProfile = currentUserId === user.id;

  const handleToggleFollow = async () => {
    if (loading) return;
    setLoading(true);

    // Optimistic update trước khi chờ API
    const wasFollowing = user.isFollowing;
    setUser((u) => ({ ...u, isFollowing: !wasFollowing }));

    try {
      const res = await fetchAPI(`/users/${user.username}/follow`, { method: "POST" });
      if (!res?.success) {
        setUser((u) => ({ ...u, isFollowing: wasFollowing }));
      } else {
        onFollowChange?.(user.username, !wasFollowing);
        window.dispatchEvent(new CustomEvent("follow-changed", {
          detail: { username: user.username, isFollowing: !wasFollowing },
        }));
      }
    } catch {
      setUser((u) => ({ ...u, isFollowing: wasFollowing }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-4">
      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-base">
              {user.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>

        {/* Tên + username */}
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {user.displayName || user.username}
            </span>
            {user.isVerified && (
              <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.45 4.506 3.745 3.745 0 01-4.506.45A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-4.506-.45 3.745 3.745 0 01-.45-4.506A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.45-4.506 3.745 3.745 0 014.506-.45A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 014.506.45 3.745 3.745 0 01.45 4.506A3.745 3.745 0 0121 12z" />
              </svg>
            )}
          </div>
          <span className="text-sm text-gray-400 dark:text-gray-500 truncate block">@{user.username}</span>
        </div>
      </Link>

      {/* Nút Follow — ẩn với chính mình */}
      {showFollowButton && !isOwnProfile && (
        <button
          onClick={handleToggleFollow}
          disabled={loading}
          className={`ml-3 flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            user.isFollowing
              ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              : "border-black bg-black text-white hover:bg-gray-800"
          } disabled:opacity-50`}
        >
          {user.isFollowing ? "Đang follow" : "Follow"}
        </button>
      )}
    </div>
  );
}

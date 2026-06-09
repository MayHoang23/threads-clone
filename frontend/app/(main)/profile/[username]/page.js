"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser, getAccessToken } from "@/lib/auth";
import PostCard from "@/components/post/PostCard";

// Skeleton cho header profile
function ProfileHeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 bg-gray-200 dark:bg-gray-700 w-full" />
      <div className="px-4 pb-4">
        <div className="flex justify-between items-start -mt-11 mb-3">
          <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-white dark:border-gray-900" />
          <div className="mt-10 h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
        <div className="flex gap-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const currentUser = getCurrentUser();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "saved"
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const bottomRef = useRef(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const isOwnProfile = currentUser?.username === username;

  const handleUploadMedia = async (file, field) => {
    const setUploading = field === "avatar" ? setUploadingAvatar : setUploadingCover;
    setUploading(true);
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("image", file);
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${base}/media/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data?.success) {
        setProfile((prev) => ({ ...prev, [field]: data.data.url }));
        if (field === "avatar") {
          const stored = localStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            localStorage.setItem("user", JSON.stringify({ ...parsed, avatar: data.data.url }));
          }
        }
        await fetch(`${base}/users/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ [field]: data.data.url }),
        });
      }
    } finally {
      setUploading(false);
    }
  };

  // Load profile khi vào trang hoặc đổi username
  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    setPosts([]);
    setCursor(null);
    setHasMore(true);

    try {
      const res = await fetchAPI(`/users/${username}`);
      if (res?.success) {
        setProfile(res.data);
        // Load bài viết ngay sau khi có profile
        await loadPosts(null, res.data);
      } else {
        router.replace("/");
      }
    } finally {
      setLoading(false);
    }
  };

  // Load bài viết của user, hỗ trợ cursor cho infinite scroll
  const loadPosts = async (cursorParam = null, profileData = profile) => {
    const qs = cursorParam ? `?cursor=${cursorParam}` : "";
    const res = await fetchAPI(`/users/${profileData?.username ?? username}/posts${qs}`);
    if (res?.success) {
      const { posts: newPosts, nextCursor, hasMore: more } = res.data;
      setPosts((prev) => (cursorParam ? [...prev, ...newPosts] : newPosts));
      setCursor(nextCursor);
      setHasMore(more);
    }
  };

  // Infinite scroll cho tab bài viết
  useEffect(() => {
    const el = bottomRef.current;
    if (!el || activeTab !== "posts") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          loadPosts(cursor).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1, rootMargin: "80px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, cursor, activeTab]);

  // Khi chuyển sang tab "Đã lưu" mới load (lazy)
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === "saved" && savedPosts.length === 0) {
      const res = await fetchAPI(`/posts/saved`);
      if (res?.success) setSavedPosts(res.data.posts ?? []);
    }
  };

  const handleToggleFollow = async () => {
    if (followLoading || !profile) return;
    setFollowLoading(true);

    // Optimistic update
    const wasFollowing = profile.isFollowing;
    setProfile((p) => ({
      ...p,
      isFollowing: !wasFollowing,
      followerCount: wasFollowing ? p.followerCount - 1 : p.followerCount + 1,
    }));

    try {
      const res = await fetchAPI(`/users/${username}/follow`, { method: "POST" });
      if (!res?.success) {
        // Rollback nếu lỗi
        setProfile((p) => ({
          ...p,
          isFollowing: wasFollowing,
          followerCount: wasFollowing ? p.followerCount + 1 : p.followerCount - 1,
        }));
      }
    } catch {
      setProfile((p) => ({
        ...p,
        isFollowing: wasFollowing,
        followerCount: wasFollowing ? p.followerCount + 1 : p.followerCount - 1,
      }));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (chatLoading || !profile) return;
    setChatLoading(true);
    try {
      const res = await fetchAPI("/conversations", {
        method: "POST",
        body: JSON.stringify({ userId: profile.id }),
      });
      if (res?.success) router.push("/messages");
    } finally {
      setChatLoading(false);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setProfile((p) => p ? { ...p, postCount: Math.max(0, p.postCount - 1) } : p);
  };

  if (loading) {
    return (
      <div>
        <ProfileHeaderSkeleton />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-gray-100 animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!profile) return null;

  const displayPosts = activeTab === "posts" ? posts : savedPosts;

  return (
    <div>
      {/* Hidden inputs upload — chỉ dùng khi isOwnProfile */}
      {isOwnProfile && (
        <>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadMedia(file, "avatar");
              e.target.value = "";
            }}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadMedia(file, "coverImage");
              e.target.value = "";
            }}
          />
        </>
      )}

      {/* ===== COVER IMAGE + AVATAR ===== */}
      <div className="relative">
        <div
          className={`relative h-40 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-400 dark:from-violet-900 dark:via-fuchsia-900 dark:to-pink-900 overflow-hidden group ${isOwnProfile ? "cursor-pointer" : ""}`}
          onClick={() => isOwnProfile && coverInputRef.current?.click()}
        >
          {profile.coverImage && (
            <img src={profile.coverImage} alt="cover" className="w-full h-full object-cover" />
          )}
          {/* Loading overlay cover */}
          {uploadingCover && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {/* Hover overlay cover — chỉ khi isOwnProfile */}
          {isOwnProfile && !uploadingCover && (
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className="text-white text-sm font-medium">Đổi ảnh bìa</span>
            </div>
          )}
        </div>
        {/* Avatar — absolute, đè lên ranh giới cover/content, không bị clip */}
        <div
          className={`absolute bottom-0 left-4 translate-y-1/2 group ${isOwnProfile ? "cursor-pointer" : ""}`}
          onClick={() => isOwnProfile && avatarInputRef.current?.click()}
        >
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-2xl">
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
            {/* Loading overlay */}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {/* Hover overlay — chỉ khi isOwnProfile và không đang upload */}
            {isOwnProfile && !uploadingAvatar && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== HEADER INFO ===== */}
      <div className="px-4 pb-0">
        {/* Placeholder avatar + Action button — flex row */}
        <div className="flex justify-between items-start mt-10 mb-3">
          <div />

          {/* Nút hành động */}
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <Link
                href="/profile/edit"
                className="px-5 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Chỉnh sửa
              </Link>
            ) : (
              <>
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold border transition-colors disabled:opacity-60 ${
                    profile.isFollowing
                      ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      : "bg-black text-white border-black hover:bg-gray-800"
                  }`}
                >
                  {followLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : profile.isFollowing ? (
                    "Đang follow"
                  ) : (
                    "Follow"
                  )}
                </button>
                <button
                  onClick={handleStartChat}
                  disabled={chatLoading}
                  className="px-5 py-1.5 rounded-full text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                >
                  {chatLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Nhắn tin"
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tên + username + bio */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h1 className="font-bold text-xl text-gray-900 dark:text-white">{profile.displayName || profile.username}</h1>
            {profile.isVerified && (
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.45 4.506 3.745 3.745 0 01-4.506.45A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-4.506-.45 3.745 3.745 0 01-.45-4.506A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.45-4.506 3.745 3.745 0 014.506-.45A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 014.506.45 3.745 3.745 0 01.45 4.506A3.745 3.745 0 0121 12z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">@{profile.username}</p>
          {profile.bio && (
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          )}
        </div>

        {/* Thống kê: bài viết / followers / following */}
        <div className="flex gap-5 text-sm mb-4">
          <span className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">{profile.postCount}</span>
            {" "}bài viết
          </span>
          <Link href={`/profile/${username}/followers`} className="text-gray-700 dark:text-gray-300 hover:underline">
            <span className="font-semibold text-gray-900 dark:text-white">{profile.followerCount}</span>
            {" "}followers
          </Link>
          <Link href={`/profile/${username}/following`} className="text-gray-700 dark:text-gray-300 hover:underline">
            <span className="font-semibold text-gray-900 dark:text-white">{profile.followingCount}</span>
            {" "}following
          </Link>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleTabChange("posts")}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
            activeTab === "posts"
              ? "border-b-2 border-black dark:border-white text-black dark:text-white"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          Bài viết
        </button>
        {/* Tab Đã lưu chỉ hiện khi xem profile của chính mình */}
        {isOwnProfile && (
          <button
            onClick={() => handleTabChange("saved")}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
              activeTab === "saved"
                ? "border-b-2 border-black dark:border-white text-black dark:text-white"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            Đã lưu
          </button>
        )}
      </div>

      {/* ===== DANH SÁCH BÀI VIẾT ===== */}
      {displayPosts.length === 0 ? (
        <div className="py-20 text-center px-4">
          <p className="text-gray-400 text-sm">
            {activeTab === "saved" ? "Chưa có bài viết nào được lưu" : "Chưa có bài viết nào"}
          </p>
        </div>
      ) : (
        <>
          {displayPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onDelete={handlePostDeleted}
            />
          ))}

          {/* Trigger cho infinite scroll (chỉ tab bài viết) */}
          {activeTab === "posts" && (
            <div ref={bottomRef} className="py-6 flex justify-center">
              {loadingMore && (
                <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
              )}
              {!hasMore && posts.length > 0 && (
                <p className="text-xs text-gray-400">Đã hết bài viết</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

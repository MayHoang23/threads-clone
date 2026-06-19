"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser, getAccessToken } from "@/lib/auth";
import PostCard from "@/components/post/PostCard";
import { useLanguage } from "@/contexts/LanguageContext";

// Format thời gian ngắn gọn cho comment trong tab Trả lời
function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "vừa xong";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}ph`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}g`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}ng`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

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
  const [replies, setReplies] = useState([]);
  const [pinnedPost, setPinnedPost] = useState(null);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "replies" | "saved"
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [repliesCursor, setRepliesCursor] = useState(null);
  const [repliesHasMore, setRepliesHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const bottomRef = useRef(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const { t } = useLanguage();
  // So sánh bằng id để chắc chắn là profile của chính mình
  // (tránh lệch hoa/thường ở username trên URL hoặc currentUser thiếu username)
  const isOwnProfile = !!currentUser?.id && currentUser.id === profile?.id;

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
    setReplies([]);
    setPinnedPost(null);
    setCursor(null);
    setHasMore(true);
    setRepliesCursor(null);
    setRepliesHasMore(true);
    setActiveTab("posts");

    try {
      const res = await fetchAPI(`/users/${username}`);
      if (res?.success) {
        setProfile(res.data);
        // Load bài viết ngay sau khi có profile
        await loadPosts(null, res.data);
        // Load bài ghim (nếu có) để hiển thị đầu tab Bài viết
        if (res.data.pinnedPostId) loadPinnedPost(res.data.pinnedPostId);
      } else {
        router.replace("/");
      }
    } finally {
      setLoading(false);
    }
  };

  // Lấy bài đang ghim qua API chi tiết — đảm bảo luôn hiện đầu tiên dù bài cũ
  const loadPinnedPost = async (postId) => {
    try {
      const res = await fetchAPI(`/posts/${postId}`);
      if (res?.success) setPinnedPost(res.data);
    } catch {
      setPinnedPost(null); // bài ghim riêng tư / không xem được → bỏ qua
    }
  };

  // Load các trả lời (comment) của user, hỗ trợ cursor cho infinite scroll
  const loadReplies = async (cursorParam = null) => {
    const qs = cursorParam ? `?cursor=${cursorParam}` : "";
    const res = await fetchAPI(`/users/${username}/replies${qs}`);
    if (res?.success) {
      const { replies: newReplies, nextCursor, hasMore: more } = res.data;
      setReplies((prev) => (cursorParam ? [...prev, ...newReplies] : newReplies));
      setRepliesCursor(nextCursor);
      setRepliesHasMore(more);
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

  // Infinite scroll cho tab Bài viết và tab Trả lời
  useEffect(() => {
    const el = bottomRef.current;
    if (!el || (activeTab !== "posts" && activeTab !== "replies")) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingMore || loading) return;
        if (activeTab === "posts" && hasMore) {
          setLoadingMore(true);
          loadPosts(cursor).finally(() => setLoadingMore(false));
        } else if (activeTab === "replies" && repliesHasMore) {
          setLoadingMore(true);
          loadReplies(repliesCursor).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1, rootMargin: "80px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, repliesHasMore, loadingMore, loading, cursor, repliesCursor, activeTab]);

  // Khi chuyển tab mới load dữ liệu (lazy)
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === "saved" && savedPosts.length === 0) {
      try {
        const res = await fetchAPI(`/posts/saved`);
        if (res?.success) setSavedPosts(res.data.posts ?? []);
        else setSavedPosts([]);
      } catch {
        setSavedPosts([]);
      }
    }
    if (tab === "replies" && replies.length === 0) {
      try {
        await loadReplies(null);
      } catch {
        setReplies([]);
      }
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
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    setReplies((prev) => prev.filter((r) => r.post?.id !== postId));
    setPinnedPost((prev) => (prev?.id === postId ? null : prev));
    setProfile((p) =>
      p
        ? {
            ...p,
            postCount: Math.max(0, p.postCount - 1),
            pinnedPostId: p.pinnedPostId === postId ? null : p.pinnedPostId,
          }
        : p
    );
  };

  // Sync follow state cross-page
  useEffect(() => {
    const handler = (e) => {
      const { username: changedUsername, isFollowing } = e.detail;
      if (changedUsername === username) {
        setProfile((prev) => prev ? { ...prev, isFollowing } : prev);
      }
    };
    window.addEventListener("follow-changed", handler);
    return () => window.removeEventListener("follow-changed", handler);
  }, [username]);

  // Sync trạng thái ghim bài real-time khi pin/unpin từ menu PostCard
  useEffect(() => {
    const handler = (e) => {
      const { postId, isPinned } = e.detail;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              pinnedPostId: isPinned
                ? postId
                : prev.pinnedPostId === postId
                  ? null
                  : prev.pinnedPostId,
            }
          : prev
      );
      if (isPinned) {
        loadPinnedPost(postId); // lấy lại bài đầy đủ để hiện đầu tab
      } else {
        setPinnedPost((prev) => (prev?.id === postId ? null : prev));
      }
    };
    window.addEventListener("post-pin-changed", handler);
    return () => window.removeEventListener("post-pin-changed", handler);
  }, [username]);

  // Sync tab Đã lưu real-time khi save/unsave từ bất kỳ đâu
  useEffect(() => {
    const onSaved = (e) => setSavedPosts((prev) => {
      if (prev.some((p) => p.id === e.detail.id)) return prev;
      return [e.detail, ...prev];
    });
    const onUnsaved = (e) => setSavedPosts((prev) => prev.filter((p) => p.id !== e.detail.id));
    window.addEventListener("post-saved", onSaved);
    window.addEventListener("post-unsaved", onUnsaved);
    return () => {
      window.removeEventListener("post-saved", onSaved);
      window.removeEventListener("post-unsaved", onUnsaved);
    };
  }, []);

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

  // Bài thường trong tab Bài viết — loại bài ghim (đã hiện riêng ở đầu)
  const postsWithoutPinned = posts.filter((p) => p.id !== profile.pinnedPostId);

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
              <span className="text-white text-sm font-medium">{t("profile.changeCover")}</span>
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
                {t("profile.editProfile")}
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
                    t("profile.followingBtn")
                  ) : (
                    t("profile.follow")
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
                    t("profile.message")
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
          {/* Website link (nếu có) */}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-sm text-blue-500 hover:underline break-all"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>{profile.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>

        {/* Thống kê: bài viết / followers / following */}
        <div className="flex gap-5 text-sm mb-4">
          <span className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">{profile.postCount}</span>
            {" "}{t("profile.postsCount")}
          </span>
          <Link href={`/profile/${username}/followers`} className="text-gray-700 dark:text-gray-300 hover:underline">
            <span className="font-semibold text-gray-900 dark:text-white">{profile.followerCount}</span>
            {" "}{t("profile.followers")}
          </Link>
          <Link href={`/profile/${username}/following`} className="text-gray-700 dark:text-gray-300 hover:underline">
            <span className="font-semibold text-gray-900 dark:text-white">{profile.followingCount}</span>
            {" "}{t("profile.following")}
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
          {t("profile.posts")}
        </button>
        <button
          onClick={() => handleTabChange("replies")}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
            activeTab === "replies"
              ? "border-b-2 border-black dark:border-white text-black dark:text-white"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          {t("profile.replies")}
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
            {t("profile.saved")}
          </button>
        )}
      </div>

      {/* ===== TAB BÀI VIẾT ===== */}
      {activeTab === "posts" && (
        <>
          {/* Bài ghim — hiện đầu tiên với badge "Đã ghim" */}
          {pinnedPost && (
            <div>
              <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14l-1.5-4.5a2 2 0 01-.1-.6V5a1 1 0 011-1h-12a1 1 0 011 1v6.9a2 2 0 01-.1.6L5 17z" />
                </svg>
                <span>{t("profile.pinned")}</span>
              </div>
              <PostCard
                key={`pinned-${pinnedPost.id}`}
                post={pinnedPost}
                currentUser={currentUser}
                onDelete={handlePostDeleted}
                pinnedPostId={profile.pinnedPostId}
              />
            </div>
          )}

          {postsWithoutPinned.length === 0 && !pinnedPost ? (
            <div className="py-20 text-center px-4">
              <p className="text-gray-400 text-sm">{t("post.noPost")}</p>
            </div>
          ) : (
            postsWithoutPinned.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onDelete={handlePostDeleted}
                pinnedPostId={profile.pinnedPostId}
              />
            ))
          )}

          <div ref={bottomRef} className="py-6 flex justify-center">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-xs text-gray-400">{t("profile.end")}</p>
            )}
          </div>
        </>
      )}

      {/* ===== TAB TRẢ LỜI ===== */}
      {activeTab === "replies" && (
        <>
          {replies.length === 0 ? (
            <div className="py-20 text-center px-4">
              <p className="text-gray-400 text-sm">{t("profile.noReplies")}</p>
            </div>
          ) : (
            replies.map(({ comment, post }) => (
              <div key={comment.id} className="border-b border-gray-100 dark:border-gray-800">
                {/* Bài gốc */}
                <PostCard
                  post={post}
                  currentUser={currentUser}
                  onDelete={handlePostDeleted}
                  pinnedPostId={profile.pinnedPostId}
                />
                {/* Trả lời của user dưới bài gốc */}
                <div className="flex gap-2.5 px-4 pb-4 -mt-1">
                  <div className="w-9 flex-shrink-0 flex justify-end pt-0.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-xs">
                          {profile.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {profile.displayName || profile.username}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                    {comment.content && (
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    )}
                    {comment.mediaUrl && (
                      <img
                        src={comment.mediaUrl}
                        alt=""
                        className="mt-2 rounded-xl max-h-72 object-cover border border-gray-100 dark:border-gray-800"
                        loading="lazy"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          <div ref={bottomRef} className="py-6 flex justify-center">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            )}
            {!repliesHasMore && replies.length > 0 && (
              <p className="text-xs text-gray-400">{t("profile.end")}</p>
            )}
          </div>
        </>
      )}

      {/* ===== TAB ĐÃ LƯU ===== */}
      {activeTab === "saved" && (
        savedPosts.length === 0 ? (
          <div className="py-20 text-center px-4">
            <p className="text-gray-400 text-sm">{t("post.noSaved")}</p>
          </div>
        ) : (
          savedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onDelete={handlePostDeleted}
              onUnsave={() => setSavedPosts((prev) => prev.filter((p) => p.id !== post.id))}
            />
          ))
        )
      )}
    </div>
  );
}

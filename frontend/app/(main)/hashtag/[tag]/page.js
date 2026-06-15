"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import PostCard from "@/components/post/PostCard";
import { useLanguage } from "@/contexts/LanguageContext";

// Skeleton placeholder cho 1 bài viết khi đang load
function PostSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
      <div className="flex gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-24" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-12" />
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function HashtagPage() {
  const params = useParams();
  // Tag từ URL có thể bị encode (vd %23) — decode về dạng thường
  const tag = decodeURIComponent(params.tag || "").replace(/^#/, "");
  const { t } = useLanguage();
  const currentUser = getCurrentUser();

  const [posts, setPosts] = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef(null);

  // Gọi API lấy bài theo hashtag (hỗ trợ cursor cho infinite scroll)
  const fetchPosts = async (cursorParam = null) => {
    try {
      const qs = cursorParam ? `?cursor=${cursorParam}` : "";
      const data = await fetchAPI(
        `/hashtags/${encodeURIComponent(tag)}/posts${qs}`
      );
      if (data?.success) {
        const { posts: newPosts, nextCursor, hasMore: more, postCount: count } =
          data.data;
        setPosts((prev) => (cursorParam ? [...prev, ...newPosts] : newPosts));
        setCursor(nextCursor);
        setHasMore(more);
        if (typeof count === "number") setPostCount(count);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load lần đầu (và khi tag thay đổi)
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  // Infinite scroll
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          fetchPosts(cursor);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, cursor]);

  // Gỡ bài khỏi danh sách khi xóa
  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
            aria-label={t("common.back")}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold text-lg text-gray-900 dark:text-white truncate">
              #{tag}
            </h1>
            {!loading && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {postCount} {t("hashtag.posts")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách bài viết */}
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)
      ) : posts.length === 0 ? (
        <div className="py-24 text-center px-4">
          <div className="text-6xl mb-4">#️⃣</div>
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t("hashtag.empty")}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t("hashtag.emptyDesc")}
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onDelete={handlePostDeleted}
            />
          ))}

          {/* Trigger infinite scroll */}
          <div ref={bottomRef} className="py-8 flex items-center justify-center">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-black dark:border-gray-700 dark:border-t-white rounded-full animate-spin" />
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t("hashtag.end")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

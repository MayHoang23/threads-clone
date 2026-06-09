"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import PostCard from "@/components/post/PostCard";
import CreatePost from "@/components/post/CreatePost";

// Skeleton placeholder cho 1 bài viết khi đang load
function PostSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="flex gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-3 bg-gray-200 rounded-full w-24" />
            <div className="h-3 bg-gray-200 rounded-full w-12" />
          </div>
          <div className="h-3 bg-gray-200 rounded-full w-3/4" />
          <div className="h-3 bg-gray-200 rounded-full w-1/2" />
          <div className="h-36 bg-gray-100 rounded-2xl w-full" />
        </div>
      </div>
    </div>
  );
}

export default function NewsfeedPage() {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef(null);
  const currentUser = getCurrentUser();

  // Gọi API lấy feed, có hỗ trợ cursor (cho infinite scroll)
  const fetchFeed = async (cursorParam = null) => {
    try {
      const qs = cursorParam ? `?cursor=${cursorParam}` : "";
      const data = await fetchAPI(`/posts/feed${qs}`);
      if (data?.success) {
        const { posts: newPosts, nextCursor, hasMore: more } = data.data;
        // Nếu là load thêm → nối vào cuối, nếu là load lần đầu → replace
        setPosts((prev) => (cursorParam ? [...prev, ...newPosts] : newPosts));
        setCursor(nextCursor);
        setHasMore(more);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load feed lần đầu khi vào trang
  useEffect(() => {
    fetchFeed();
  }, []);

  // IntersectionObserver: khi phần tử bottomRef xuất hiện trong viewport → load thêm
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Chỉ load khi đang nhìn thấy + còn bài + không đang load
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          fetchFeed(cursor);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, cursor]); // Re-setup khi cursor hoặc loading state thay đổi

  // Bài tạo từ modal Navbar (không có onPostCreated prop)
  useEffect(() => {
    const handler = (e) => setPosts((prev) => [e.detail, ...prev]);
    window.addEventListener("post-created", handler);
    return () => window.removeEventListener("post-created", handler);
  }, []);

  // onPostCreated prop kept for compatibility; event listener above already handles it
  const handlePostCreated = () => {};

  // Callback từ PostCard khi xóa: gỡ bài khỏi danh sách
  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div>
      {/* Header sticky cho mobile */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 lg:hidden">
        <div className="px-4 py-3">
          <h1 className="font-bold text-lg">Dành cho bạn</h1>
        </div>
      </div>

      {/* Header desktop */}
      <div className="hidden lg:block border-b border-gray-100 px-4 py-4">
        <h1 className="font-bold text-base text-gray-900">Dành cho bạn</h1>
      </div>

      {/* Ô tạo bài mới */}
      <CreatePost currentUser={currentUser} onPostCreated={handlePostCreated} />

      {/* Danh sách bài viết */}
      {loading ? (
        // Hiển thị 5 skeleton trong khi chờ
        Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)
      ) : posts.length === 0 ? (
        // Empty state khi chưa có bài
        <div className="py-24 text-center px-4">
          <div className="text-6xl mb-4">🌱</div>
          <p className="font-semibold text-gray-700 mb-1">Feed của bạn đang trống</p>
          <p className="text-sm text-gray-400">
            Hãy follow người khác hoặc đăng bài đầu tiên!
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

          {/* Phần tử trigger infinite scroll — nằm dưới cùng của list */}
          <div ref={bottomRef} className="py-8 flex items-center justify-center">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-xs text-gray-400">Bạn đã xem hết rồi 🎉</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

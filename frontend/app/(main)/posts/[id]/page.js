"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import PostCard from "@/components/post/PostCard";
import CommentSection from "@/components/post/CommentSection";

// Skeleton loading cho trang chi tiết
function DetailSkeleton() {
  return (
    <div className="px-4 py-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function PostDetailPage({ params }) {
  const { id } = params;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentUser = getCurrentUser();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI(`/posts/${id}`);
        if (data?.success) {
          setPost(data.data);
        } else {
          setError(data?.message || "Bài viết không tồn tại");
        }
      } catch {
        setError("Không thể tải bài viết");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div>
      {/* Header với nút Back */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors -ml-1.5"
          >
            <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-semibold text-base text-gray-900 dark:text-white">Bài viết</h1>
        </div>
      </div>

      {/* Nội dung */}
      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        /* Error state */
        <div className="py-24 text-center px-4">
          <div className="text-5xl mb-4">😕</div>
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-2 text-sm text-black underline underline-offset-2"
          >
            Quay lại
          </button>
        </div>
      ) : (
        <>
          {/* PostCard — khi xóa bài thì quay lại trang trước */}
          <PostCard
            post={post}
            currentUser={currentUser}
            onDelete={() => router.back()}
          />

          {/* Phần bình luận */}
          <CommentSection postId={id} currentUser={currentUser} />

          {/* Khoảng trắng dưới cùng */}
          <div className="h-20" />
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import UserCard from "@/components/user/UserCard";

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 px-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        <div className="space-y-2">
          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-28" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
    </div>
  );
}

export default function FollowersPage() {
  const { username } = useParams();
  const router = useRouter();
  const currentUser = getCurrentUser();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchAPI(`/users/${username}/followers`);
        if (res?.success) setUsers(res.data ?? []);
        else setError(res?.message ?? "Không thể tải danh sách");
      } catch {
        setError("Đã có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  return (
    <div className="dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-900 dark:text-white"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <h1 className="font-bold text-base text-gray-900 dark:text-white">Người theo dõi</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">@{username}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : error ? (
        <div className="py-20 text-center px-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-20 text-center px-4">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Chưa có người theo dõi nào</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              currentUserId={currentUser?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import StoryUploader from "./StoryUploader";
import StoryViewer from "./StoryViewer";

// Cắt username tối đa 8 ký tự
function shortName(name = "") {
  return name.length > 8 ? `${name.slice(0, 8)}…` : name;
}

function AvatarCircle({ user }) {
  return (
    <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-lg select-none">
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

// Hàng avatar stories trên đầu newsfeed
export default function StoryBar({ currentUser }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null); // null = đóng, number = startGroupIndex

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await fetchAPI("/stories/feed");
        if (data?.success) setGroups(data.data);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  // Prepend story mới vào đầu feed sau khi đăng
  const handleUploaded = (newStory) => {
    setGroups((prev) => {
      const storyItem = {
        id: newStory.id,
        mediaUrl: newStory.mediaUrl,
        mediaType: newStory.mediaType,
        caption: newStory.caption,
        bgColor: newStory.bgColor,
        createdAt: newStory.createdAt,
        expiresAt: newStory.expiresAt,
        viewed: false,
      };
      const idx = prev.findIndex((g) => g.user.id === currentUser?.id);
      if (idx >= 0) {
        // Đã có group của mình → thêm story mới lên đầu group, đưa group lên đầu feed
        const own = { ...prev[idx], stories: [storyItem, ...prev[idx].stories], hasUnviewed: true };
        return [own, ...prev.filter((_, i) => i !== idx)];
      }
      return [{ user: newStory.user, stories: [storyItem], hasUnviewed: true }, ...prev];
    });
  };

  // Đóng viewer → recompute hasUnviewed (viewer đã mutate story.viewed)
  const handleViewerClose = () => {
    setViewerIndex(null);
    setGroups((prev) =>
      prev.map((g) => ({ ...g, hasUnviewed: g.stories.some((s) => !s.viewed) }))
    );
  };

  if (!currentUser) return null;

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3">
      <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {loading ? (
          // Skeleton: 4 vòng tròn placeholder
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 animate-pulse">
              <div className="w-[60px] h-[60px] rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-2.5 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          ))
        ) : (
          <>
            {/* Nút tạo tin — avatar của mình + dấu cộng xanh */}
            <button
              onClick={() => setShowUploader(true)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className="relative w-[60px] h-[60px] rounded-full border-2 border-gray-300 dark:border-gray-600 p-[2px]">
                <AvatarCircle user={currentUser} />
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full border-2 border-white dark:border-gray-950 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Tạo tin</span>
            </button>

            {/* Avatar từng user có story */}
            {groups.map((g, i) => (
              <button
                key={g.user.id}
                onClick={() => setViewerIndex(i)}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <div
                  className={`w-[60px] h-[60px] rounded-full p-[2px] ${
                    g.hasUnviewed
                      ? "bg-gradient-to-tr from-orange-400 to-pink-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-950">
                    <AvatarCircle user={g.user} />
                  </div>
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {shortName(g.user.username)}
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Modal đăng story */}
      {showUploader && (
        <StoryUploader onClose={() => setShowUploader(false)} onUploaded={handleUploaded} />
      )}

      {/* Modal xem story */}
      {viewerIndex !== null && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerIndex}
          currentUserId={currentUser.id}
          onClose={handleViewerClose}
        />
      )}
    </div>
  );
}

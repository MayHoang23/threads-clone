"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";

const IMAGE_DURATION = 5000; // Mỗi story ảnh hiển thị 5 giây

// Thời gian tương đối kiểu "5 phút", "3 giờ"
function timeAgo(dateStr) {
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút`;
  return `${Math.floor(diffMins / 60)} giờ`;
}

function Avatar({ user }) {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-sm select-none">
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

// Modal xem story full screen
// groups: [{ user, stories: [...], hasUnviewed }] — từ GET /stories/feed
export default function StoryViewer({ groups, startGroupIndex = 0, currentUserId, onClose }) {
  // pos.g = index group, pos.s = index story trong group
  const [pos, setPos] = useState({ g: startGroupIndex, s: 0 });
  const [progress, setProgress] = useState(0); // 0–100 của story hiện tại
  const videoRef = useRef(null);

  const group = groups[pos.g];
  const story = group?.stories[pos.s];

  const goNext = () => {
    if (pos.s + 1 < group.stories.length) {
      setPos({ g: pos.g, s: pos.s + 1 });
    } else if (pos.g + 1 < groups.length) {
      setPos({ g: pos.g + 1, s: 0 });
    } else {
      onClose?.(); // Hết tất cả groups → đóng
    }
  };

  const goPrev = () => {
    if (pos.s > 0) {
      setPos({ g: pos.g, s: pos.s - 1 });
    } else if (pos.g > 0) {
      setPos({ g: pos.g - 1, s: groups[pos.g - 1].stories.length - 1 });
    }
    // Đang ở story đầu tiên của group đầu tiên → giữ nguyên
  };

  // Khóa scroll body + phím Escape đóng modal
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Mỗi khi đổi story: mark đã xem + chạy timer (ảnh) — video tự điều khiển progress
  useEffect(() => {
    setProgress(0);
    if (!story) return;

    if (!story.viewed) {
      // Mutate trực tiếp để StoryBar recompute hasUnviewed khi đóng viewer
      story.viewed = true;
      fetchAPI(`/stories/${story.id}/view`, { method: "POST" }).catch(() => {});
    }

    if (story.mediaType === "video") return;

    const start = Date.now();
    const timer = setInterval(() => {
      const pct = ((Date.now() - start) / IMAGE_DURATION) * 100;
      if (pct >= 100) {
        clearInterval(timer);
        goNext();
      } else {
        setProgress(pct);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [pos]);

  if (!group || !story) return null;

  const isOwnStory = group.user.id === currentUserId;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Vùng story 9:16 ở giữa màn hình */}
      <div className="relative w-full h-full sm:w-auto sm:aspect-[9/16] sm:max-h-[95vh] sm:rounded-2xl overflow-hidden bg-gray-900">
        {/* Media */}
        <div className="absolute inset-0 flex items-center justify-center">
          {story.mediaType === "video" ? (
            <video
              ref={videoRef}
              key={story.id}
              src={story.mediaUrl}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress((v.currentTime / v.duration) * 100);
              }}
              onEnded={goNext}
            />
          ) : story.mediaType === "text" ? (
            // Story văn bản — nền màu, nội dung căn giữa, timer 5s như story ảnh
            <div
              key={story.id}
              style={{ background: story.bgColor || "#1a1a2e" }}
              className="w-full h-full flex items-center justify-center p-8"
            >
              <p className="text-white text-2xl font-medium text-center leading-relaxed">
                {story.caption}
              </p>
            </div>
          ) : (
            <img key={story.id} src={story.mediaUrl} alt="" className="w-full h-full object-contain" />
          )}
        </div>

        {/* Click zones: nửa trái → trước, nửa phải → tiếp */}
        <button onClick={goPrev} className="absolute left-0 top-0 h-full w-1/2 z-[5]" aria-label="Story trước" />
        <button onClick={goNext} className="absolute right-0 top-0 h-full w-1/2 z-[5]" aria-label="Story tiếp theo" />

        {/* Header: progress bars + user info + nút đóng */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent pb-8">
          {/* Progress bars — 1 segment / story trong group hiện tại */}
          <div className="flex gap-1 px-3 pt-3">
            {group.stories.map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: i < pos.s ? "100%" : i === pos.s ? `${progress}%` : "0%" }}
                />
              </div>
            ))}
          </div>

          {/* User info + nút X */}
          <div className="flex items-center justify-between px-3 mt-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar user={group.user} />
              <div>
                <p className="text-white text-sm font-semibold leading-tight">
                  {isOwnStory ? "Tin của bạn" : group.user.displayName || group.user.username}
                </p>
                <p className="text-white/70 text-xs">{timeAgo(story.createdAt)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Caption — story text không render ở đây vì caption đã là nội dung chính giữa màn hình */}
        {story.caption && story.mediaType !== "text" && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent pt-8 pb-4 px-4">
            <p className="text-white text-sm text-center leading-relaxed">{story.caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}

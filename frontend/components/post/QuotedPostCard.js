"use client";

import Link from "next/link";

// Format thời gian ngắn gọn (giống PostCard)
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

// Card nhúng hiển thị bài được quote / bài gốc.
// disableLink=true → render div (dùng trong QuoteModal, không điều hướng khi bấm)
export default function QuotedPostCard({ post, disableLink = false }) {
  if (!post) return null;

  const author = post.author;
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? {}
    : { href: `/posts/${post.id}` };

  return (
    <Wrapper
      {...wrapperProps}
      className={`block mt-2 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 transition-colors ${
        disableLink ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
      }`}
    >
      {/* Header bài gốc */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {author?.avatar ? (
            <img src={author.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-[10px] font-bold select-none">
              {author?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
          {author?.username}
        </span>
        {author?.isVerified && (
          <svg className="w-3 h-3 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.45 4.506 3.745 3.745 0 01-4.506.45A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-4.506-.45 3.745 3.745 0 01-.45-4.506A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.45-4.506 3.745 3.745 0 014.506-.45A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 014.506.45 3.745 3.745 0 01.45 4.506A3.745 3.745 0 0121 12z" />
          </svg>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          · {timeAgo(post.createdAt)}
        </span>
      </div>

      {/* Nội dung bài gốc */}
      {post.content && (
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
          {post.content}
        </p>
      )}

      {/* Preview media bài gốc */}
      {post.media?.length > 0 && (
        <div className="mt-2 relative rounded-xl overflow-hidden aspect-[16/10] bg-gray-100 dark:bg-gray-800">
          {post.media[0].type === "VIDEO" ? (
            <video src={post.media[0].url} className="w-full h-full object-cover" muted playsInline />
          ) : (
            <img src={post.media[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
          )}
          {post.media.length > 1 && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
              +{post.media.length - 1}
            </div>
          )}
        </div>
      )}
    </Wrapper>
  );
}

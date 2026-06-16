"use client";

// Card hiển thị Open Graph preview của 1 link.
// Dùng chung cho:
//  - CreatePost (truyền onDismiss → hiện nút X, không tự mở link khi click)
//  - PostCard   (không truyền onDismiss → click mở link trong tab mới)
export default function LinkPreviewCard({
  url,
  title,
  description,
  image,
  siteName,
  onDismiss,
}) {
  if (!url) return null;

  // Trong CreatePost (có onDismiss) thì không mở link khi bấm vào card
  const clickable = !onDismiss;

  const handleClick = () => {
    if (clickable) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleClick}
      className={`relative border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 transition-colors ${
        clickable
          ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
          : ""
      }`}
    >
      {/* Nút X bỏ preview — chỉ có trong CreatePost */}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
          aria-label="Bỏ link preview"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Ảnh OG */}
      {image && (
        <img
          src={image}
          alt=""
          className="w-full max-h-[200px] object-cover bg-gray-100 dark:bg-gray-800"
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Thông tin: site name + title + description */}
      <div className="px-3 py-2.5">
        {siteName && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5 truncate">
            {siteName}
          </p>
        )}
        {title && (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {title}
          </p>
        )}
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// Skeleton khi đang fetch OG (dùng trong CreatePost)
export function LinkPreviewSkeleton() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden animate-pulse">
      <div className="w-full h-[120px] bg-gray-200 dark:bg-gray-800" />
      <div className="px-3 py-2.5 space-y-2">
        <div className="h-2.5 w-1/4 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    </div>
  );
}

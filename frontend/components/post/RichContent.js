"use client";

import Link from "next/link";

// Render nội dung bài viết với @mention và #hashtag clickable.
// - @username → /profile/username (màu violet)
// - #hashtag  → /hashtag/tagname (màu xanh)
// Regex kết hợp /([@#]\w+)/g rồi check ký tự đầu để phân biệt @ vs #.
export default function RichContent({ text }) {
  if (!text) return null;

  const parts = text.split(/([@#]\w+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <Link
              key={i}
              href={`/profile/${part.slice(1)}`}
              className="text-violet-500 hover:underline"
            >
              {part}
            </Link>
          );
        }
        if (part.startsWith("#")) {
          return (
            <Link
              key={i}
              href={`/hashtag/${part.slice(1)}`}
              className="text-blue-500 hover:underline"
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

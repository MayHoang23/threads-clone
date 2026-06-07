"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";

// Props:
//   content: string — nội dung bài viết (theo dõi realtime)
//   onAddHashtag(tag: string) — callback khi user bấm thêm hashtag vào content
const DEBOUNCE_MS = 1000;
const MAX_DISPLAY = 8;

export default function HashtagSuggester({ content, onAddHashtag }) {
  const [hashtags, setHashtags] = useState([]);
  const [added, setAdded] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);
  const lastContentRef = useRef("");

  useEffect(() => {
    const trimmed = content?.trim() || "";

    // Không gọi API nếu content không đổi hoặc quá ngắn
    if (trimmed === lastContentRef.current || trimmed.length < 10) {
      if (trimmed.length < 10) {
        setHashtags([]);
        setError("");
      }
      return;
    }

    // Debounce 1000ms trước khi gọi AI
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastContentRef.current = trimmed;
      setLoading(true);
      setError("");

      try {
        const data = await fetchAPI("/ai/suggest-hashtags", {
          method: "POST",
          body: JSON.stringify({ content: trimmed }),
        });
        if (data?.success) {
          const tags = (data.data.hashtags || []).slice(0, MAX_DISPLAY);
          setHashtags(tags);
          // Reset trạng thái "đã thêm" khi có gợi ý mới
          setAdded(new Set());
        } else {
          setError(data?.message || "Không gợi ý được hashtag");
        }
      } catch (err) {
        if (err.status === 429) {
          setError("Đã dùng quá giới hạn, vui lòng thử lại sau.");
        } else {
          // Lỗi nhỏ — không show lỗi to, chỉ để trống
          setHashtags([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [content]);

  const handleToggle = (tag) => {
    setAdded((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
        onAddHashtag?.(`#${tag}`);
      }
      return next;
    });
  };

  if (!content?.trim() || content.trim().length < 10) return null;

  return (
    <div className="mt-2 px-1">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-violet-600 text-xs font-semibold"># Hashtag gợi ý</span>
        {loading && (
          <svg className="animate-spin w-3 h-3 text-violet-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mb-1">{error}</p>}

      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((tag) => {
            const isAdded = added.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggle(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95 ${
                  isAdded
                    ? "bg-violet-600 text-white border border-violet-600"
                    : "bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 hover:border-violet-300"
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { fetchAPI } from "@/lib/api";

const PRIVACY_OPTIONS = [
  { value: "PUBLIC", label: "🌍 Mọi người" },
  { value: "FRIENDS", label: "👥 Bạn bè" },
  { value: "PRIVATE", label: "🔒 Chỉ mình tôi" },
];

function Avatar({ user }) {
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
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

export default function CreatePost({ currentUser, onPostCreated }) {
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("PUBLIC");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea theo nội dung
  const handleContentChange = (e) => {
    setContent(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      const data = await fetchAPI("/posts", {
        method: "POST",
        body: JSON.stringify({ content: content.trim(), privacy }),
      });
      if (data?.success) {
        setContent("");
        setFocused(false);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        onPostCreated?.(data.data); // Callback thêm bài mới lên đầu feed
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = () => {
    // Chỉ close khi không có nội dung
    if (!content.trim()) setFocused(false);
  };

  const charsLeft = 500 - content.length;
  const canPost = content.trim() && charsLeft >= 0;

  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Avatar user={currentUser} />
          {/* Thread line dưới avatar khi đang mở form */}
          {focused && <div className="w-0.5 bg-gray-200 flex-1 mt-2 min-h-[16px] rounded-full" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Username */}
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {currentUser?.username ?? "..."}
          </p>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            placeholder="Có gì mới không?"
            rows={focused ? 3 : 1}
            className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none resize-none bg-transparent leading-relaxed"
            onKeyDown={(e) => {
              // Ctrl+Enter hoặc Cmd+Enter để đăng
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
          />

          {/* Thanh footer: privacy + nút đăng — chỉ hiện khi focus */}
          {focused && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="text-xs text-gray-400 bg-transparent outline-none cursor-pointer hover:text-gray-600 transition-colors"
              >
                {PRIVACY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-3">
                {/* Bộ đếm ký tự — đỏ khi gần đầy */}
                <span className={`text-xs ${charsLeft < 20 ? "text-red-500" : "text-gray-400"}`}>
                  {charsLeft}
                </span>

                <button
                  onClick={handleSubmit}
                  disabled={!canPost || loading}
                  className="px-4 py-1.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Đang đăng
                    </span>
                  ) : (
                    "Đăng"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

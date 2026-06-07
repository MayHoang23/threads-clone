"use client";

import { useState } from "react";
import { fetchAPI } from "@/lib/api";

const TONE_OPTIONS = [
  { value: "casual", label: "Thân thiện" },
  { value: "professional", label: "Chuyên nghiệp" },
  { value: "funny", label: "Hài hước" },
];

// Props:
//   onSelectCaption(caption: string) — callback khi user chọn caption
export default function CaptionGenerator({ onSelectCaption }) {
  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState("casual");
  const [captions, setCaptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleGenerate = async () => {
    if (!idea.trim() || loading) return;
    setLoading(true);
    setError("");
    setCaptions([]);
    setSelectedIndex(null);

    try {
      const data = await fetchAPI("/ai/generate-caption", {
        method: "POST",
        body: JSON.stringify({ idea: idea.trim(), tone }),
      });
      if (data?.success) {
        setCaptions(data.data.captions || []);
      } else {
        setError(data?.message || "Không tạo được caption");
      }
    } catch (err) {
      if (err.status === 429) {
        setError("Bạn đã dùng quá 20 lần/giờ. Vui lòng thử lại sau.");
      } else if (err.status === 401) {
        setError("Vui lòng đăng nhập để dùng tính năng AI.");
      } else {
        setError("Lỗi kết nối AI, vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (caption, index) => {
    setSelectedIndex(index);
    onSelectCaption?.(caption);
  };

  return (
    <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-violet-600 text-sm font-semibold">✨ AI Caption</span>
      </div>

      {/* Input ý tưởng */}
      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Nhập ý tưởng bài viết của bạn..."
        rows={2}
        maxLength={500}
        className="w-full text-sm text-gray-800 placeholder-gray-400 bg-white border border-violet-200 rounded-lg px-3 py-2 outline-none resize-none focus:border-violet-400 transition-colors"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
        }}
      />

      {/* Chọn giọng văn + nút tạo */}
      <div className="flex items-center gap-2 mt-2">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="text-xs text-violet-700 bg-white border border-violet-200 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
        >
          {TONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!idea.trim() || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Đang tạo...
            </>
          ) : (
            "Tạo caption"
          )}
        </button>
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {/* Danh sách caption gợi ý */}
      {captions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {captions.map((caption, i) => (
            <div
              key={i}
              onClick={() => handleSelect(caption, i)}
              className={`p-2.5 bg-white rounded-lg border cursor-pointer transition-all duration-200 ease-out
                animate-[fadeIn_0.3s_ease-out]
                ${selectedIndex === i
                  ? "border-violet-500 ring-1 ring-violet-400 bg-violet-50"
                  : "border-violet-100 hover:border-violet-300 hover:bg-violet-50"
                }`}
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              <p className="text-sm text-gray-800 leading-relaxed">{caption}</p>
              <button
                type="button"
                className="mt-1.5 text-xs text-violet-600 font-medium hover:text-violet-800"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(caption, i);
                }}
              >
                Dùng caption này
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

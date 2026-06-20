"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";

// Popup chọn GIF (GIPHY) tái sử dụng cho CreatePost + MessageInput.
// Props:
//   onSelect(gifUrl) — gọi với URL GIF đầy đủ khi user chọn 1 GIF
//   onClose()        — đóng popup (click ra ngoài hoặc sau khi chọn)
//   className        — vị trí popup (absolute), parent quyết định trên/dưới
// Đặt component này bên trong 1 container "relative" ở parent.
export default function GifPicker({
    onSelect,
    onClose,
    className = "left-0 top-full mt-2",
}) {
    const [query, setQuery] = useState("");
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const debounceRef = useRef(null);

    // Fetch GIF — query rỗng = trending (load ngay), có query = debounce 500ms
    useEffect(() => {
        const q = query.trim();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
            async () => {
                setLoading(true);
                try {
                    const res = await fetchAPI(
                        `/media/gif-search?q=${encodeURIComponent(q)}&limit=24`,
                    );
                    setGifs(res?.data || []);
                } catch {
                    setGifs([]);
                } finally {
                    setLoading(false);
                }
            },
            q ? 500 : 0,
        );
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    return (
        <>
            {/* Backdrop bắt click ra ngoài để đóng (đè cả nút toggle → không bị mở lại ngay) */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            <div
                className={`absolute z-50 w-72 sm:w-80 max-h-[70vh] flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Ô tìm kiếm */}
                <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                        <svg
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tìm GIF trên GIPHY..."
                            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-full outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                </div>

                {/* Lưới GIF — 3 cột, dùng previewUrl (tinygif), lazy loading */}
                <div className="h-56 overflow-y-auto p-2">
                    {loading ? (
                        <div className="grid grid-cols-3 gap-1.5">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : gifs.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
                            Không tìm thấy GIF
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                            {gifs.map((g) => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(g.url);
                                        onClose();
                                    }}
                                    title={g.description}
                                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-violet-500 transition-all"
                                >
                                    <img
                                        src={g.previewUrl}
                                        alt={g.description}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Attribution GIPHY (bắt buộc theo điều khoản dùng API) */}
                <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Powered by GIPHY
                    </p>
                </div>
            </div>
        </>
    );
}

"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { fetchAPI } from "@/lib/api";

// Avatar nhỏ cho mỗi item trong dropdown gợi ý mention
function MentionAvatar({ user }) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
      {user.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-xs font-bold select-none">
          {user.username?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

// Textarea tái sử dụng có @mention autocomplete + tự co giãn chiều cao.
//
// LƯU Ý: onChange(value: string) trả về CHUỖI mới (không phải event) — giúp việc
// chèn mention vào giữa nội dung trở nên đơn giản. Các consumer cần truyền
// onChange={(value) => setX(value)} thay vì đọc e.target.value.
//
// Dùng forwardRef để parent vẫn nắm được DOM textarea (focus, đặt con trỏ...).
const MentionTextarea = forwardRef(function MentionTextarea(
  {
    value,
    onChange,
    onKeyDown,
    onFocus,
    onBlur,
    placeholder,
    className = "",
    rows = 1,
    disabled = false,
    maxLength,
    autoFocus = false,
  },
  ref
) {
  const innerRef = useRef(null);
  // mention = { start, query } khi đang gõ @..., hoặc null
  const [mention, setMention] = useState(null);
  const [results, setResults] = useState([]);

  // Gộp ref nội bộ với ref được forward từ parent
  const setRefs = (node) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  // Tự co giãn chiều cao theo nội dung (rỗng → để rows attribute quyết định)
  useEffect(() => {
    const ta = innerRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    if (value) ta.style.height = `${ta.scrollHeight}px`;
  }, [value]);

  // Tìm user cho mention autocomplete (debounce 250ms)
  useEffect(() => {
    if (!mention || mention.query.length < 1) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetchAPI(
          `/users/search?q=${encodeURIComponent(mention.query)}&limit=5`
        );
        if (res?.success) setResults((res.data.users || []).slice(0, 5));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [mention]);

  // Phát hiện ngữ cảnh @mention: @ đứng đầu hoặc sau khoảng trắng, theo sau là \w*.
  // Đóng dropdown khi gõ space / không khớp.
  const detectMention = (val, caret) => {
    const before = val.slice(0, caret ?? val.length);
    const m = before.match(/(?:^|\s)@(\w*)$/);
    if (m) {
      setMention({ start: caret - m[1].length - 1, query: m[1] });
    } else {
      setMention(null);
      setResults([]);
    }
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
    detectMention(e.target.value, e.target.selectionStart);
  };

  // Chèn @username vào vị trí đang gõ, thêm khoảng trắng phía sau
  const selectMention = (username) => {
    if (!mention) return;
    const ta = innerRef.current;
    const caret = ta?.selectionStart ?? value.length;
    const newValue =
      value.slice(0, mention.start) + "@" + username + " " + value.slice(caret);
    onChange?.(newValue);
    setMention(null);
    setResults([]);
    const newCaret = mention.start + username.length + 2;
    setTimeout(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(newCaret, newCaret);
    }, 0);
  };

  const handleKeyDown = (e) => {
    // Escape đóng dropdown trước, không nổi bọt lên parent
    if (e.key === "Escape" && mention) {
      setMention(null);
      setResults([]);
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <textarea
        ref={setRefs}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className={className}
      />

      {/* Dropdown gợi ý mention */}
      {mention && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              // onMouseDown + preventDefault: tránh blur textarea, giữ vị trí con trỏ
              onMouseDown={(e) => {
                e.preventDefault();
                selectMention(u.username);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <MentionAvatar user={u} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  @{u.username}
                </p>
                {u.displayName && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {u.displayName}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default MentionTextarea;

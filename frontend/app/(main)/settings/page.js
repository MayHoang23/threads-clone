"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";

// ========================
// TOAST COMPONENT (không dùng thư viện ngoài)
// ========================
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium
        animate-[slideUp_0.2s_ease-out] transition-all
        ${type === "success"
          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
          : "bg-red-500 text-white"
        }`}
    >
      {type === "success" ? (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ========================
// TOGGLE SWITCH UI
// ========================
function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </label>
  );
}

// ========================
// PASSWORD INPUT với show/hide
// ========================
function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {show ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ========================
// CÁC MỤC TRONG SIDEBAR
// ========================
const SECTIONS = [
  { key: "account", label: "Tài khoản", icon: "👤" },
  { key: "privacy", label: "Quyền riêng tư", icon: "🔒" },
  { key: "notifications", label: "Thông báo", icon: "🔔" },
  { key: "appearance", label: "Giao diện", icon: "🎨" },
];

// ========================
// MAIN PAGE
// ========================
export default function SettingsPage() {
  const { isDark } = useTheme();

  const [activeSection, setActiveSection] = useState("account");
  const [toast, setToast] = useState(null);

  // Loading state riêng cho từng section
  const [loadingSection, setLoadingSection] = useState(null);

  // State form đổi mật khẩu
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // State quyền riêng tư
  const [privacy, setPrivacy] = useState({
    isPrivate: false,
    allowMessagesFrom: "EVERYONE",
  });

  // State thông báo
  const [notifs, setNotifs] = useState({
    likeNotif: true,
    commentNotif: true,
    followNotif: true,
    emailNotif: false,
  });

  // Lấy settings hiện tại khi mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI("/settings");
        if (data?.success) {
          const s = data.data;
          setPrivacy({ isPrivate: s.isPrivate ?? false, allowMessagesFrom: s.allowMessagesFrom ?? "EVERYONE" });
          setNotifs({
            likeNotif: s.likeNotif ?? true,
            commentNotif: s.commentNotif ?? true,
            followNotif: s.followNotif ?? true,
            emailNotif: s.emailNotif ?? false,
          });
        }
      } catch {
        // Không hiện lỗi — giữ giá trị mặc định
      }
    })();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // ========================
  // ĐỔI MẬT KHẨU
  // ========================
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) {
      return showToast("Mật khẩu mới phải có ít nhất 8 ký tự", "error");
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return showToast("Mật khẩu xác nhận không khớp", "error");
    }

    setLoadingSection("account");
    try {
      await fetchAPI("/settings/password", {
        method: "PATCH",
        body: JSON.stringify(pwForm),
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Đổi mật khẩu thành công!");
    } catch (err) {
      showToast(err.message || "Đổi mật khẩu thất bại", "error");
    } finally {
      setLoadingSection(null);
    }
  };

  // ========================
  // LƯU QUYỀN RIÊNG TƯ
  // ========================
  const handleSavePrivacy = async () => {
    setLoadingSection("privacy");
    try {
      await fetchAPI("/settings/privacy", {
        method: "PATCH",
        body: JSON.stringify(privacy),
      });
      showToast("Cập nhật quyền riêng tư thành công!");
    } catch (err) {
      showToast(err.message || "Cập nhật thất bại", "error");
    } finally {
      setLoadingSection(null);
    }
  };

  // ========================
  // LƯU THÔNG BÁO
  // ========================
  const handleSaveNotifs = async () => {
    setLoadingSection("notifications");
    try {
      await fetchAPI("/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify(notifs),
      });
      showToast("Cập nhật thông báo thành công!");
    } catch (err) {
      showToast(err.message || "Cập nhật thất bại", "error");
    } finally {
      setLoadingSection(null);
    }
  };

  // ========================
  // RENDER CONTENT TỪNG SECTION
  // ========================
  const renderSection = () => {
    switch (activeSection) {
      case "account":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Đổi mật khẩu</h2>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <PasswordInput
                label="Mật khẩu hiện tại"
                value={pwForm.currentPassword}
                onChange={(v) => setPwForm((f) => ({ ...f, currentPassword: v }))}
                placeholder="Nhập mật khẩu hiện tại"
              />
              <PasswordInput
                label="Mật khẩu mới"
                value={pwForm.newPassword}
                onChange={(v) => setPwForm((f) => ({ ...f, newPassword: v }))}
                placeholder="Ít nhất 8 ký tự"
              />
              <PasswordInput
                label="Xác nhận mật khẩu mới"
                value={pwForm.confirmPassword}
                onChange={(v) => setPwForm((f) => ({ ...f, confirmPassword: v }))}
                placeholder="Nhập lại mật khẩu mới"
              />
              {/* Hiển thị lỗi khớp mật khẩu trực tiếp */}
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <p className="text-xs text-red-500">Mật khẩu không khớp</p>
              )}
              <button
                type="submit"
                disabled={loadingSection === "account" || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loadingSection === "account" ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </form>
          </div>
        );

      case "privacy":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Quyền riêng tư</h2>
            <div className="max-w-sm space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
              <Toggle
                checked={privacy.isPrivate}
                onChange={(v) => setPrivacy((p) => ({ ...p, isPrivate: v }))}
                label="Tài khoản riêng tư"
                description="Chỉ người được chấp nhận mới thấy bài viết của bạn"
              />
              <div className="py-3">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Ai có thể nhắn tin cho bạn
                </label>
                <select
                  value={privacy.allowMessagesFrom}
                  onChange={(e) => setPrivacy((p) => ({ ...p, allowMessagesFrom: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-gray-100 focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                >
                  <option value="EVERYONE">Mọi người</option>
                  <option value="FOLLOWING">Người bạn đang follow</option>
                  <option value="NONE">Không ai</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSavePrivacy}
              disabled={loadingSection === "privacy"}
              className="mt-6 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loadingSection === "privacy" ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        );

      case "notifications":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Thông báo</h2>
            <div className="max-w-sm divide-y divide-gray-100 dark:divide-gray-800">
              <Toggle
                checked={notifs.likeNotif}
                onChange={(v) => setNotifs((n) => ({ ...n, likeNotif: v }))}
                label="Lượt thích"
                description="Nhận thông báo khi ai đó thích bài viết của bạn"
              />
              <Toggle
                checked={notifs.commentNotif}
                onChange={(v) => setNotifs((n) => ({ ...n, commentNotif: v }))}
                label="Bình luận"
                description="Nhận thông báo khi ai đó bình luận bài của bạn"
              />
              <Toggle
                checked={notifs.followNotif}
                onChange={(v) => setNotifs((n) => ({ ...n, followNotif: v }))}
                label="Lượt theo dõi"
                description="Nhận thông báo khi ai đó follow bạn"
              />
              <Toggle
                checked={notifs.emailNotif}
                onChange={(v) => setNotifs((n) => ({ ...n, emailNotif: v }))}
                label="Thông báo email"
                description="Gửi thông báo quan trọng qua email"
              />
            </div>
            <button
              onClick={handleSaveNotifs}
              disabled={loadingSection === "notifications"}
              className="mt-6 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loadingSection === "notifications" ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        );

      case "appearance":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Giao diện</h2>
            <div className="max-w-sm">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Chế độ tối</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isDark ? "Đang bật" : "Đang tắt"}
                  </p>
                </div>
                <ThemeToggle />
              </div>
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                Tùy chỉnh sẽ được lưu tự động và áp dụng ngay lập tức.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cài đặt</h1>
      </div>

      <div className="flex">
        {/* ===== SIDEBAR — desktop ===== */}
        <nav className="hidden md:flex flex-col w-52 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 min-h-[calc(100vh-57px)] pt-4 px-2">
          {SECTIONS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors mb-0.5 ${
                activeSection === key
                  ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* ===== TABS — mobile ===== */}
        <div className="md:hidden w-full">
          <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-800 px-4 gap-1 no-scrollbar">
            {SECTIONS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSection === key
                    ? "border-black dark:border-white text-black dark:text-white"
                    : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="flex-1 px-6 py-6 md:py-8 max-w-2xl">{renderSection()}</div>
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

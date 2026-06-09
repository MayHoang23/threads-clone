"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { getCurrentUser, getAccessToken } from "@/lib/auth";

export default function EditProfilePage() {
  const router = useRouter();
  const currentUser = getCurrentUser();

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    avatar: "",
    coverImage: "",
    isPrivate: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  const handleUploadImage = async (file, field, setUploading) => {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/media/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data?.success) {
        setForm((prev) => ({ ...prev, [field]: data.data.url }));
      } else {
        setUploadError(data?.message ?? "Upload thất bại");
      }
    } catch {
      setUploadError("Đã có lỗi khi upload ảnh");
    } finally {
      setUploading(false);
    }
  };

  // Điền sẵn dữ liệu hiện tại từ profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser?.username) return;
      const res = await fetchAPI(`/users/${currentUser.username}`);
      if (res?.success) {
        const p = res.data;
        setForm({
          displayName: p.displayName ?? "",
          bio: p.bio ?? "",
          avatar: p.avatar ?? "",
          coverImage: p.coverImage ?? "",
          isPrivate: p.isPrivate ?? false,
        });
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetchAPI("/users/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });

      if (res?.success) {
        // Cập nhật localStorage để Navbar/các nơi khác thấy avatar mới ngay
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem(
            "user",
            JSON.stringify({ ...parsed, displayName: form.displayName, avatar: form.avatar })
          );
        }
        setSuccess(true);
        setTimeout(() => router.push(`/profile/${currentUser.username}`), 1000);
      } else {
        setError(res?.message ?? "Cập nhật thất bại");
      }
    } catch {
      setError("Đã có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-900 dark:text-white">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="font-bold text-base">Chỉnh sửa profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5">
        {/* Hidden file inputs */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadImage(file, "avatar", setUploadingAvatar);
            e.target.value = "";
          }}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadImage(file, "coverImage", setUploadingCover);
            e.target.value = "";
          }}
        />

        {/* ===== PREVIEW COVER ===== */}
        <div
          className="relative h-28 rounded-xl overflow-hidden bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-400 dark:from-violet-900 dark:via-fuchsia-900 dark:to-pink-900 cursor-pointer group"
          onClick={() => !uploadingCover && coverInputRef.current?.click()}
        >
          {form.coverImage && (
            <img src={form.coverImage} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
          )}
          {uploadingCover ? (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Đổi ảnh bìa
              </span>
            </div>
          )}
        </div>

        {/* ===== PREVIEW AVATAR ===== */}
        <div className="flex justify-center -mt-14">
          <div
            className="relative cursor-pointer"
            onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
          >
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 ring-4 ring-white dark:ring-gray-950">
              {uploadingAvatar ? (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                  <span className="w-6 h-6 border-2 border-gray-400 border-t-gray-700 dark:border-t-white rounded-full animate-spin" />
                </div>
              ) : form.avatar ? (
                <img src={form.avatar} alt="Avatar preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-3xl">
                  {currentUser?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-black dark:bg-white rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white dark:text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
        </div>

        {/* ===== FORM FIELDS ===== */}
        <div className="space-y-4">
          {/* Tên hiển thị */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tên hiển thị</label>
            <input
              type="text"
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              placeholder="Tên của bạn"
              maxLength={50}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Giới thiệu bản thân..."
              maxLength={160}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">{form.bio.length}/160</p>
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">URL Avatar</label>
            <input
              type="url"
              name="avatar"
              value={form.avatar}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">URL Ảnh bìa</label>
            <input
              type="url"
              name="coverImage"
              value={form.coverImage}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            {/* Preview ảnh bìa */}
            {form.coverImage && (
              <div className="mt-2 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img src={form.coverImage} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
              </div>
            )}
          </div>

          {/* Tài khoản riêng tư */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tài khoản riêng tư</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Chỉ người được chấp nhận mới thấy bài viết</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isPrivate: !f.isPrivate }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.isPrivate ? "bg-black" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${form.isPrivate ? "left-[26px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Thông báo lỗi / thành công */}
        {uploadError && <p className="text-red-500 text-sm text-center">{uploadError}</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-600 text-sm text-center font-medium">Cập nhật thành công!</p>}

        {/* Nút lưu */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang lưu...
            </>
          ) : (
            "Lưu thay đổi"
          )}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    displayName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate phía client
    if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
      setError("Username, email và mật khẩu là bắt buộc");
      return;
    }
    if (formData.username.length < 3) {
      setError("Username phải có ít nhất 3 ký tự");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Email không hợp lệ");
      return;
    }
    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password,
        formData.displayName.trim() || formData.username.trim()
      );

      if (result.success) {
        // Đăng ký thành công → chuyển về login để đăng nhập
        router.push("/login");
      } else {
        setError(result.message || "Đăng ký thất bại");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng kiểm tra lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-2xl mb-4">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tham gia Threads ngay hôm nay
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            autoComplete="username"
            className="w-full px-4 py-3.5 bg-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-black transition-all"
          />
        </div>

        {/* displayName — không bắt buộc */}
        <div>
          <input
            type="text"
            name="displayName"
            placeholder="Tên hiển thị (không bắt buộc)"
            value={formData.displayName}
            onChange={handleChange}
            className="w-full px-4 py-3.5 bg-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-black transition-all"
          />
        </div>

        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            className="w-full px-4 py-3.5 bg-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-black transition-all"
          />
        </div>

        <div>
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu (ít nhất 6 ký tự)"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            className="w-full px-4 py-3.5 bg-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-black transition-all"
          />
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Nút đăng ký */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-black text-white rounded-2xl text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Đang tạo tài khoản...
            </span>
          ) : (
            "Tạo tài khoản"
          )}
        </button>
      </form>

      {/* Điều khoản */}
      <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
        Bằng cách đăng ký, bạn đồng ý với{" "}
        <span className="underline cursor-pointer">Điều khoản</span> và{" "}
        <span className="underline cursor-pointer">Chính sách bảo mật</span>
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs">hoặc</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Link đăng nhập */}
      <p className="text-center text-sm text-gray-500">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="text-black font-semibold hover:underline underline-offset-2"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

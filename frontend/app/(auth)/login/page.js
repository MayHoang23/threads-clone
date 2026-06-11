"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  // Quản lý dữ liệu form
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Cập nhật giá trị input và xóa lỗi cũ khi người dùng gõ
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate cơ bản phía client trước khi gọi API
    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Email không hợp lệ");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await login(formData.email.trim(), formData.password);

      if (result.success) {
        // Đăng nhập thành công → về trang chủ
        router.push("/");
        router.refresh(); // Buộc Next.js re-render để middleware nhận cookie mới
      } else {
        setError(result.message || "Đăng nhập thất bại");
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
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-2xl mb-4">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Đăng nhập vào Threads</h1>
        <p className="text-gray-500 text-sm mt-1">
          Chào mừng bạn quay trở lại
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              className="w-full px-4 py-3.5 pr-12 bg-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Link quên mật khẩu */}
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-gray-500 hover:text-black hover:underline underline-offset-2 transition-colors"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Nút đăng nhập */}
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
              Đang đăng nhập...
            </span>
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs">hoặc</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Link đăng ký */}
      <p className="text-center text-sm text-gray-500">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="text-black font-semibold hover:underline underline-offset-2"
        >
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}

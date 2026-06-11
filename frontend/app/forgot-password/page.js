"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email không hợp lệ");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await fetchAPI("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      // Luôn hiển thị thành công — không tiết lộ email tồn tại hay không
      setSent(true);
    } catch {
      // Kể cả lỗi server vẫn không tiết lộ gì thêm
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-gray-950">
      <div className="w-full max-w-sm">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Kiểm tra email của bạn</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu. Link có hiệu lực trong 1 giờ.
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Về trang đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-black dark:bg-white rounded-2xl mb-4">
                <span className="text-white dark:text-black font-bold text-xl">T</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quên mật khẩu?</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-2xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              />

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
              >
                {loading ? "Đang gửi..." : "Gửi link đặt lại"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Nhớ ra mật khẩu rồi?{" "}
              <Link href="/login" className="text-black dark:text-white font-semibold hover:underline underline-offset-2">
                Đăng nhập
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

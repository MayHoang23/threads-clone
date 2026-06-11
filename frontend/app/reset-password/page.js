"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await fetchAPI("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      if (data?.success) {
        setDone(true);
        setMessage(data.message || "Đặt lại mật khẩu thành công");
      }
    } catch (err) {
      setError(err.message || "Token không hợp lệ hoặc đã hết hạn");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 mx-auto bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Đã đặt lại mật khẩu</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <Link
          href="/login"
          className="inline-block mt-6 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-black dark:bg-white rounded-2xl mb-4">
          <span className="text-white dark:text-black font-bold text-xl">T</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Đặt lại mật khẩu</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <input
          type="password"
          placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError("");
          }}
          autoComplete="new-password"
          className="w-full px-4 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-2xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
        />
        <input
          type="password"
          placeholder="Xác nhận mật khẩu mới"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError("");
          }}
          autoComplete="new-password"
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
          {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        <Link href="/login" className="text-black dark:text-white font-semibold hover:underline underline-offset-2">
          Về trang đăng nhập
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-gray-950">
      {/* useSearchParams bắt buộc nằm trong Suspense boundary (Next 14) */}
      <Suspense fallback={null}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}

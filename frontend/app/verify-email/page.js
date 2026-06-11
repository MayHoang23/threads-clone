"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // "loading" | "success" | "error"
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  // Guard StrictMode dev chạy effect 2 lần — lần 2 token đã bị xóa sẽ báo lỗi sai
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("Token không hợp lệ hoặc đã hết hạn");
      return;
    }

    const verify = async () => {
      try {
        const data = await fetchAPI(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (data?.success) {
          setStatus("success");
          setMessage(data.message || "Xác thực email thành công");
        } else {
          setStatus("error");
          setMessage("Token không hợp lệ hoặc đã hết hạn");
        }
      } catch {
        setStatus("error");
        setMessage("Token không hợp lệ hoặc đã hết hạn");
      }
    };
    verify();
  }, [token]);

  return (
    <div className="w-full max-w-sm text-center">
      {status === "loading" && (
        <>
          <div className="w-8 h-8 mx-auto border-2 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Đang xác thực email...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-14 h-14 mx-auto bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Xác thực thành công</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <Link
            href="/login"
            className="inline-block mt-6 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Đăng nhập ngay
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-14 h-14 mx-auto bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Xác thực thất bại</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <Link
            href="/login"
            className="inline-block mt-6 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Về trang đăng nhập
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-gray-950">
      {/* useSearchParams bắt buộc nằm trong Suspense boundary (Next 14) */}
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";

// Layout cho nhóm route (auth): /login và /register
// Căn giữa màn hình, nền trắng.
// Bọc GoogleOAuthProvider ở đây (thay vì root layout) để chỉ ảnh hưởng tới trang
// đăng nhập/đăng ký — nơi duy nhất dùng Google login.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function AuthLayout({ children }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      {/* Toast cho lỗi đăng nhập Google — (main) layout có Toaster riêng, nhưng nhóm auth thì chưa */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          className:
            "!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !text-sm !border !border-gray-200 dark:!border-gray-700 !shadow-lg",
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
    </GoogleOAuthProvider>
  );
}

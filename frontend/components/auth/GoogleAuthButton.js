"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { googleLogin } from "@/lib/auth";

// Nút "Đăng nhập bằng Google" với UI tùy chỉnh hoàn toàn.
//
// Dùng hook useGoogleLogin (implicit flow): bấm nút → mở popup chọn tài khoản trực tiếp
// bằng JS, KHÔNG cần overlay iframe trong suốt (cách cũ click không ổn định).
// onSuccess trả về tokenResponse.access_token → gửi xuống backend, backend gọi
// Google userinfo endpoint để lấy email/name/picture (xem auth.service.js googleLogin).
export default function GoogleAuthButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const accessToken = tokenResponse?.access_token;
            if (!accessToken) {
                toast.error("Không nhận được thông tin từ Google");
                return;
            }

            setLoading(true);
            try {
                const result = await googleLogin(accessToken);
                if (result.success) {
                    // Đăng nhập thành công → về trang chủ (giữ loading vì sắp điều hướng)
                    router.push("/");
                    router.refresh(); // Buộc Next.js re-render để middleware nhận cookie mới
                } else {
                    toast.error(result.message || "Đăng nhập Google thất bại");
                    setLoading(false);
                }
            } catch {
                toast.error("Lỗi kết nối. Vui lòng thử lại");
                setLoading(false);
            }
        },
        onError: () => {
            toast.error("Đăng nhập Google thất bại, vui lòng thử lại");
        },
    });

    return (
        <button
            type="button"
            onClick={() => login()}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
            {loading ? (
                <svg
                    className="animate-spin h-5 w-5 text-gray-700 dark:text-gray-200"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                    />
                </svg>
            ) : (
                <>
                    {/* Logo Google 4 màu chính thức, 20x20 */}
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Đăng nhập bằng Google
                    </span>
                </>
            )}
        </button>
    );
}

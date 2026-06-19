"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { isAuthenticated } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { SocketProvider } from "@/contexts/SocketContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function MainLayout({ children }) {
    const [ready, setReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Kiểm tra auth phía client (middleware đã xử lý server-side,
        // đây là lớp bảo vệ thêm nếu cookie hết hạn nhưng user vẫn ở trang)
        if (!isAuthenticated()) {
            router.replace("/login");
            return;
        }
        setReady(true);
    }, []);

    // Hiển thị loading spinner khi đang kiểm tra auth
    if (!ready) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] dark:bg-gray-950 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <LanguageProvider>
            <SocketProvider>
                {/* Wrapper ngoài cùng: full width, nền trắng/đen */}
                <div className="min-h-screen w-full bg-white dark:bg-gray-950 transition-colors duration-300">
                    {/* Toast toàn cục — render qua portal dưới <html>, nên class dark: tự áp dụng.
                        Dùng prefix ! (important) để override inline style mặc định của react-hot-toast. */}
                    <Toaster
                        position="top-center"
                        toastOptions={{
                            duration: 3000,
                            className:
                                "!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !text-sm !border !border-gray-200 dark:!border-gray-700 !shadow-lg",
                            success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
                            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
                        }}
                    />

                    {/* Navbar: sidebar cố định trái (desktop) hoặc bottom bar (mobile) */}
                    <Navbar />

                    {/* Toàn bộ nội dung căn giữa, tối đa 1320px — không vùng trống 2 bên */}
                    <div className="max-w-[1320px] mx-auto flex">
                        {/* Cột trái — placeholder giữ chỗ cho Navbar cố định.
                            Tablet (md): sidebar thu gọn w-16 · Desktop (lg+): sidebar đầy đủ w-64 */}
                        <div className="hidden md:block shrink-0 w-16 lg:w-64" />

                        {/* Cột giữa (main) — feed/content chính, giãn full giữa navbar và sidebar */}
                        <main className="flex-1 min-w-0 min-h-screen border-x border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 transition-colors duration-300">
                            {children}
                        </main>

                        {/* Cột phải (aside) — Sidebar gợi ý, main giãn full đã đẩy nó sát lề phải (xl+) */}
                        <aside className="hidden xl:block w-80 px-6 py-6">
                            <div className="sticky top-6">
                                <Sidebar />
                            </div>
                        </aside>
                    </div>

                    {/* Padding dưới cho mobile (tránh bị bottom navbar che) — chỉ <md vì md+ có sidebar */}
                    <div className="h-16 md:hidden" />
                </div>
            </SocketProvider>
        </LanguageProvider>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { SocketProvider } from "@/contexts/SocketContext";

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
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SocketProvider>
      <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
        {/* Navbar: sidebar cố định trái (desktop) hoặc bottom bar (mobile) */}
        <Navbar />

        {/* Nội dung chính — thụt sang phải để tránh chồng lên sidebar desktop */}
        <div className="lg:pl-64">
          <div className="max-w-5xl mx-auto flex">
            {/* Feed / content chính — giới hạn 620px, có border hai bên */}
            <main className="flex-1 max-w-[620px] min-h-screen border-x border-gray-100 dark:border-gray-800 transition-colors duration-300">
              {children}
            </main>

            {/* Sidebar gợi ý — chỉ hiện trên màn hình rất rộng (xl+) */}
            <aside className="hidden xl:block w-80 px-6 py-6">
              <div className="sticky top-6">
                <Sidebar />
              </div>
            </aside>
          </div>
        </div>

        {/* Padding dưới cho mobile (tránh bị bottom navbar che) */}
        <div className="h-16 lg:hidden" />
      </div>
    </SocketProvider>
  );
}

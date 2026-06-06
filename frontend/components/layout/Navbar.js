"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import { useState } from "react";
import NotificationBell, { MobileNotificationBell } from "@/components/notifications/NotificationBell";

// SVG icons cho từng mục nav (filled = active, outline = inactive)
const HomeIcon = ({ active }) =>
  active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );

const SearchIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ComposeIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const ActivityIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

const ProfileIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// NAV_ITEMS không có Thông báo — thay bằng NotificationBell component riêng
const NAV_ITEMS = [
  { href: "/", label: "Trang chủ", Icon: HomeIcon },
  { href: "/search", label: "Tìm kiếm", Icon: SearchIcon },
  { href: "/compose", label: "Tạo bài", Icon: ComposeIcon, alwaysOutline: true },
  { href: "/profile", label: "Hồ sơ", Icon: ProfileIcon },
];

// NAV_ITEMS mobile có đầy đủ để build bottom bar
const MOBILE_NAV_ITEMS = [
  { href: "/", label: "Trang chủ", Icon: HomeIcon },
  { href: "/search", label: "Tìm kiếm", Icon: SearchIcon },
  { href: "/compose", label: "Tạo bài", Icon: ComposeIcon, alwaysOutline: true },
  { href: "/notifications", label: "Thông báo", isNotification: true },
  { href: "/profile", label: "Hồ sơ", Icon: ProfileIcon },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const currentUser = getCurrentUser();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      {/* ===== DESKTOP: sidebar cố định bên trái ===== */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 border-r border-gray-100 bg-white z-40 px-3 py-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 mb-8 rounded-2xl hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">T</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Threads</span>
        </Link>

        {/* Nav links */}
        <div className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, Icon, alwaysOutline }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-colors font-medium text-sm ${
                  isActive
                    ? "bg-gray-100 text-black font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-black"
                }`}
              >
                <Icon active={isActive && !alwaysOutline} />
                {label}
              </Link>
            );
          })}
          {/* NotificationBell thay thế ActivityIcon — có dropdown + real-time badge */}
          <NotificationBell isActive={pathname.startsWith("/notifications")} />
        </div>

        {/* User section dưới cùng */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-xs font-bold">
                    {currentUser.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate">{currentUser.username}</p>
                <p className="text-xs text-gray-400 truncate">{currentUser.displayName}</p>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute bottom-14 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-20">
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Xem hồ sơ
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-semibold text-red-500 hover:bg-gray-50 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ===== MOBILE: navbar cố định phía dưới ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-40 safe-area-pb">
        <div className="flex items-center justify-around max-w-md mx-auto px-2 py-2">
          {MOBILE_NAV_ITEMS.map(({ href, label, Icon, alwaysOutline, isNotification }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            // Mục thông báo dùng MobileNotificationBell riêng (có badge real-time)
            if (isNotification) {
              return <MobileNotificationBell key={href} isActive={isActive} />;
            }
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center p-2 rounded-2xl transition-colors ${
                  isActive ? "text-black" : "text-gray-400"
                }`}
                aria-label={label}
              >
                <Icon active={isActive && !alwaysOutline} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

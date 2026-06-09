"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import { useState, useMemo } from "react";
import NotificationBell, { MobileNotificationBell } from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import CreatePost from "@/components/post/CreatePost";
import { useLanguage } from "@/contexts/LanguageContext";

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


const ProfileIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MessagesIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const SettingsIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const currentUser = getCurrentUser();
  const { t } = useLanguage();

  const openCreatePost = () => window.dispatchEvent(new CustomEvent("open-create-post"));

  // NAV_ITEMS không có Thông báo — thay bằng NotificationBell component riêng
  const NAV_ITEMS = useMemo(() => [
    { href: "/", label: t("nav.home"), Icon: HomeIcon },
    { href: "/search", label: t("nav.search"), Icon: SearchIcon },
    { href: null, label: t("nav.create"), Icon: ComposeIcon, isCompose: true },
    { href: "/messages", label: t("nav.messages"), Icon: MessagesIcon },
    { href: "/settings", label: t("nav.settings"), Icon: SettingsIcon },
    { href: `/profile/${currentUser?.username}`, label: t("nav.profile"), Icon: ProfileIcon },
  ], [currentUser?.username, t]);

  // NAV_ITEMS mobile có đầy đủ để build bottom bar
  const MOBILE_NAV_ITEMS = useMemo(() => [
    { href: "/", label: t("nav.home"), Icon: HomeIcon },
    { href: "/search", label: t("nav.search"), Icon: SearchIcon },
    { href: null, label: t("nav.create"), Icon: ComposeIcon, isCompose: true },
    { href: "/messages", label: t("nav.messages"), Icon: MessagesIcon },
    { href: "/notifications", label: t("nav.notifications"), isNotification: true },
    { href: `/profile/${currentUser?.username}`, label: t("nav.profile"), Icon: ProfileIcon },
  ], [currentUser?.username, t]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      {/* ===== DESKTOP: sidebar cố định bên trái ===== */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 z-40 px-3 py-6 transition-colors duration-300">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 mb-8 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white dark:text-black font-bold text-base">T</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-gray-100">Threads</span>
        </Link>

        {/* Nav links */}
        <div className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, Icon, isCompose }) => {
            if (isCompose) {
              return (
                <button
                  key="compose"
                  onClick={openCreatePost}
                  className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-colors font-medium text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-black dark:hover:text-white"
                >
                  <Icon active={false} />
                  {label}
                </button>
              );
            }
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-colors font-medium text-sm ${
                  isActive
                    ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-black dark:hover:text-white"
                }`}
              >
                <Icon active={isActive} />
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
            {/* Theme toggle */}
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">{t("nav.theme")}</span>
              <ThemeToggle />
            </div>

            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-xs font-bold">
                    {currentUser.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">{currentUser.username}</p>
                <p className="text-xs text-gray-400 truncate">{currentUser.displayName}</p>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute bottom-14 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-20">
                  <Link
                    href={`/profile/${currentUser?.username}`}
                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    {t("nav.viewProfile")}
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    {t("nav.settings")}
                  </Link>
                  <div className="border-t border-gray-100 dark:border-gray-800" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-semibold text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Global modal — listens for 'open-create-post' event, works on any page */}
      <CreatePost currentUser={currentUser} modal={true} />

      {/* ===== MOBILE: navbar cố định phía dưới ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 z-40 safe-area-pb transition-colors duration-200">
        <div className="flex items-center justify-around max-w-md mx-auto px-2 py-2">
          {MOBILE_NAV_ITEMS.map(({ href, label, Icon, isCompose, isNotification }) => {
            if (isCompose) {
              return (
                <button
                  key="compose"
                  onClick={openCreatePost}
                  className="flex flex-col items-center p-2 rounded-2xl transition-colors text-gray-400 dark:text-gray-600"
                  aria-label={label}
                >
                  <Icon active={false} />
                </button>
              );
            }
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            if (isNotification) {
              return <MobileNotificationBell key={href} isActive={isActive} />;
            }
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center p-2 rounded-2xl transition-colors ${
                  isActive ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-600"
                }`}
                aria-label={label}
              >
                <Icon active={isActive} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

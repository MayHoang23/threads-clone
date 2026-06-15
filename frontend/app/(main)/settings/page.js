"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

// ========================
// TOAST COMPONENT (không dùng thư viện ngoài)
// ========================
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium
        animate-[slideUp_0.2s_ease-out] transition-all
        ${type === "success"
          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
          : "bg-red-500 text-white"
        }`}
    >
      {type === "success" ? (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ========================
// TOGGLE SWITCH UI
// ========================
function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </label>
  );
}

// ========================
// PASSWORD INPUT với show/hide
// ========================
function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {show ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ========================
// MAIN PAGE
// ========================
export default function SettingsPage() {
  const { isDark } = useTheme();
  const { t, locale, changeLanguage } = useLanguage();

  const SECTIONS = [
    { key: "account", label: t("settings.account"), icon: "👤" },
    { key: "privacy", label: t("settings.privacy"), icon: "🔒" },
    { key: "notifications", label: t("settings.notificationsTab"), icon: "🔔" },
    { key: "appearance", label: t("settings.appearance"), icon: "🎨" },
    { key: "language", label: t("settings.language"), icon: "🌐" },
  ];

  const LANGUAGES = [
    { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
  ];

  const [activeSection, setActiveSection] = useState("account");
  const [toast, setToast] = useState(null);
  const [loadingSection, setLoadingSection] = useState(null);
  const [showMessageDropdown, setShowMessageDropdown] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [privacy, setPrivacy] = useState({
    isPrivate: false,
    allowMessagesFrom: "EVERYONE",
  });

  const [notifs, setNotifs] = useState({
    likeNotif: true,
    commentNotif: true,
    followNotif: true,
    emailNotif: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI("/settings");
        if (data?.success) {
          const s = data.data;
          setPrivacy({ isPrivate: s.isPrivate ?? false, allowMessagesFrom: s.allowMessagesFrom ?? "EVERYONE" });
          setNotifs({
            likeNotif: s.likeNotif ?? true,
            commentNotif: s.commentNotif ?? true,
            followNotif: s.followNotif ?? true,
            emailNotif: s.emailNotif ?? false,
          });
        }
      } catch {
        // giữ giá trị mặc định
      }
    })();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) {
      return showToast(t("settings.passwordShort"), "error");
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return showToast(t("settings.passwordMismatch"), "error");
    }

    setLoadingSection("account");
    try {
      await fetchAPI("/settings/password", {
        method: "PATCH",
        body: JSON.stringify(pwForm),
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast(t("settings.passwordChanged"));
    } catch (err) {
      showToast(err.message || t("settings.passwordFailed"), "error");
    } finally {
      setLoadingSection(null);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "account":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">{t("settings.changePassword")}</h2>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <PasswordInput
                label={t("settings.currentPassword")}
                value={pwForm.currentPassword}
                onChange={(v) => setPwForm((f) => ({ ...f, currentPassword: v }))}
                placeholder={t("settings.currentPasswordPlaceholder")}
              />
              <PasswordInput
                label={t("settings.newPassword")}
                value={pwForm.newPassword}
                onChange={(v) => setPwForm((f) => ({ ...f, newPassword: v }))}
                placeholder={t("settings.newPasswordPlaceholder")}
              />
              <PasswordInput
                label={t("settings.confirmPassword")}
                value={pwForm.confirmPassword}
                onChange={(v) => setPwForm((f) => ({ ...f, confirmPassword: v }))}
                placeholder={t("settings.confirmPasswordPlaceholder")}
              />
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <p className="text-xs text-red-500">{t("settings.passwordNoMatch")}</p>
              )}
              <button
                type="submit"
                disabled={loadingSection === "account" || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loadingSection === "account" ? t("settings.saving") : t("settings.changePasswordBtn")}
              </button>
            </form>
          </div>
        );

      case "privacy":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">{t("settings.privacy")}</h2>
            <div className="max-w-sm space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
              <Toggle
                checked={privacy.isPrivate}
                onChange={async (v) => {
                  const newPrivacy = { ...privacy, isPrivate: v };
                  setPrivacy(newPrivacy);
                  try {
                    await fetchAPI("/settings/privacy", { method: "PATCH", body: JSON.stringify(newPrivacy) });
                    showToast(t("settings.saveSuccess"));
                  } catch { showToast(t("settings.updateFailed"), "error"); }
                }}
                label={t("settings.privateAccount")}
                description={t("settings.privateDesc")}
              />
              <div className="py-3">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t("settings.whoCanMessage")}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMessageDropdown((v) => !v)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                  >
                    <span>
                      {privacy.allowMessagesFrom === "EVERYONE" ? t("settings.everyone") :
                       privacy.allowMessagesFrom === "FOLLOWING" ? t("settings.followersOnly") :
                       t("settings.noOne")}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showMessageDropdown ? "rotate-180" : "rotate-0"}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {showMessageDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMessageDropdown(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-20">
                        {[
                          { value: "EVERYONE", label: t("settings.everyone") },
                          { value: "FOLLOWING", label: t("settings.followersOnly") },
                          { value: "NONE", label: t("settings.noOne") },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={async () => {
                              setShowMessageDropdown(false);
                              const newPrivacy = { ...privacy, allowMessagesFrom: option.value };
                              setPrivacy(newPrivacy);
                              try {
                                await fetchAPI("/settings/privacy", { method: "PATCH", body: JSON.stringify(newPrivacy) });
                                showToast(t("settings.saveSuccess"));
                              } catch { showToast(t("settings.updateFailed"), "error"); }
                            }}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              privacy.allowMessagesFrom === option.value
                                ? "font-semibold text-black dark:text-white bg-gray-50 dark:bg-gray-700"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">{t("settings.notificationsTab")}</h2>
            <div className="max-w-sm divide-y divide-gray-100 dark:divide-gray-800">
              <Toggle
                checked={notifs.likeNotif}
                onChange={async (v) => {
                  const newNotifs = { ...notifs, likeNotif: v };
                  setNotifs(newNotifs);
                  try {
                    await fetchAPI("/settings/notifications", { method: "PATCH", body: JSON.stringify(newNotifs) });
                    showToast(t("settings.saveSuccess"));
                  } catch { showToast(t("settings.updateFailed"), "error"); }
                }}
                label={t("settings.likeNotif")}
                description={t("settings.likeNotifDesc")}
              />
              <Toggle
                checked={notifs.commentNotif}
                onChange={async (v) => {
                  const newNotifs = { ...notifs, commentNotif: v };
                  setNotifs(newNotifs);
                  try {
                    await fetchAPI("/settings/notifications", { method: "PATCH", body: JSON.stringify(newNotifs) });
                    showToast(t("settings.saveSuccess"));
                  } catch { showToast(t("settings.updateFailed"), "error"); }
                }}
                label={t("settings.commentNotif")}
                description={t("settings.commentNotifDesc")}
              />
              <Toggle
                checked={notifs.followNotif}
                onChange={async (v) => {
                  const newNotifs = { ...notifs, followNotif: v };
                  setNotifs(newNotifs);
                  try {
                    await fetchAPI("/settings/notifications", { method: "PATCH", body: JSON.stringify(newNotifs) });
                    showToast(t("settings.saveSuccess"));
                  } catch { showToast(t("settings.updateFailed"), "error"); }
                }}
                label={t("settings.followNotif")}
                description={t("settings.followNotifDesc")}
              />
              <Toggle
                checked={notifs.emailNotif}
                onChange={async (v) => {
                  const newNotifs = { ...notifs, emailNotif: v };
                  setNotifs(newNotifs);
                  try {
                    await fetchAPI("/settings/notifications", { method: "PATCH", body: JSON.stringify(newNotifs) });
                    showToast(t("settings.saveSuccess"));
                  } catch { showToast(t("settings.updateFailed"), "error"); }
                }}
                label={t("settings.emailNotif")}
                description={t("settings.emailNotifDesc")}
              />
            </div>
          </div>
        );

      case "appearance":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">{t("settings.appearance")}</h2>
            <div className="max-w-sm">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("settings.darkMode")}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isDark ? t("settings.darkModeOn") : t("settings.darkModeOff")}
                  </p>
                </div>
                <ThemeToggle />
              </div>
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                {t("settings.darkModeHint")}
              </p>
            </div>
          </div>
        );

      case "language":
        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t("settings.selectLanguage")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t("settings.languageDesc")}</p>
            <div className="max-w-sm space-y-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    locale === lang.code
                      ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.label}</span>
                  {locale === lang.code && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-[#F9F9F9] dark:bg-gray-950">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("settings.title")}</h1>
      </div>

      <div className="flex">
        {/* ===== SIDEBAR — desktop ===== */}
        <nav className="hidden md:flex flex-col w-52 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 min-h-[calc(100vh-57px)] pt-4 px-2">
          {SECTIONS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors mb-0.5 ${
                activeSection === key
                  ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* ===== TABS — mobile ===== */}
        <div className="md:hidden w-full">
          <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-800 px-4 gap-1 no-scrollbar">
            {SECTIONS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSection === key
                    ? "border-black dark:border-white text-black dark:text-white"
                    : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="flex-1 px-6 py-6 md:py-8 max-w-2xl">{renderSection()}</div>
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

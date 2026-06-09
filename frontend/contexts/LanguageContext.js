"use client";

import { createContext, useContext, useState } from "react";
import vi from "@/lib/translations/vi";
import en from "@/lib/translations/en";
import zh from "@/lib/translations/zh";

const translations = { vi, en, zh };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window === "undefined") return "vi";
    const saved = localStorage.getItem("locale");
    return saved && ["vi", "en", "zh"].includes(saved) ? saved : "vi";
  });

  const changeLanguage = (newLocale) => {
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  const t = (key) => {
    const keys = key.split(".");
    let value = translations[locale];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
};

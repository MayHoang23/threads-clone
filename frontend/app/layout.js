import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Threads Clone",
  description: "Mạng xã hội chia sẻ suy nghĩ",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: script inline bên dưới thay đổi class "dark" trước khi
    // React hydrate → Next.js sẽ cảnh báo mismatch nếu không có prop này
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/*
          Script chạy đồng bộ trước khi React render — đặt class "dark" ngay lập tức
          nếu user đã chọn dark mode. Tránh "flash of white" khi reload ở dark mode.
          Không dùng next/script vì cần chạy TRƯỚC khi bất kỳ content nào render.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

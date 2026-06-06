import { NextResponse } from "next/server";

// Routes yêu cầu đăng nhập
const PROTECTED_ROUTES = ["/"];

// Routes chỉ dành cho người chưa đăng nhập (đã đăng nhập → redirect về /)
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Middleware không đọc được localStorage — đọc cookie thay thế
  // Cookie "accessToken" được set trong lib/auth.js khi đăng nhập
  const accessToken = request.cookies.get("accessToken")?.value;
  const isLoggedIn = !!accessToken;

  // Nếu vào route cần đăng nhập mà chưa có token → về /login
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    // Lưu lại trang muốn vào để sau khi login redirect đúng chỗ
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Nếu đã đăng nhập mà vào /login hoặc /register → về /
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Chỉ chạy middleware trên các path này (bỏ qua static files, API routes)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

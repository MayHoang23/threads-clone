const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// ========================
// ĐĂNG NHẬP
// ========================
export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();

  if (data.success) {
    // Lưu tokens vào localStorage để dùng trong các request API sau này
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("refreshToken", data.data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.data.user));

    // Set cookie để Next.js middleware đọc được (middleware không dùng localStorage được)
    // max-age=900 = 15 phút, khớp với access token expiry
    document.cookie = `accessToken=${data.data.accessToken}; path=/; max-age=900`;
  }

  return data;
}

// ========================
// ĐĂNG KÝ
// ========================
export async function register(username, email, password, displayName) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, displayName }),
  });
  return res.json();
}

// ========================
// ĐĂNG XUẤT
// ========================
export async function logout() {
  try {
    await fetch(`${BASE_URL}/auth/logout`, { method: "POST" });
  } catch {
    // Kể cả API lỗi vẫn xóa token ở client
  }

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  // Xóa cookie để middleware biết đã đăng xuất
  document.cookie = "accessToken=; path=/; max-age=0";
}

// ========================
// HÀM TIỆN ÍCH
// ========================

// Lấy access token từ localStorage (trả về null nếu chạy phía server)
export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

// Kiểm tra đã đăng nhập chưa (chỉ dùng phía client)
export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
}

// Lấy thông tin user đang đăng nhập
export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

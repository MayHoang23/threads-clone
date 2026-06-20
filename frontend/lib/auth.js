const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// ========================
// LƯU TOKEN SAU KHI ĐĂNG NHẬP
// ========================
// Dùng chung cho mọi flow đăng nhập (email/password lẫn Google) — nhận data.data
// từ response { user, accessToken, refreshToken } và lưu vào localStorage + cookie.
function saveToken({ accessToken, refreshToken, user }) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));

  // Set cookie để Next.js middleware đọc được (middleware không dùng localStorage được)
  // max-age=900 = 15 phút, khớp với access token expiry
  document.cookie = `accessToken=${accessToken}; path=/; max-age=900`;
}

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
    saveToken(data.data);
  }

  return data;
}

// ========================
// ĐĂNG NHẬP BẰNG GOOGLE
// ========================
// accessToken = Google OAuth access token lấy từ hook useGoogleLogin onSuccess
export async function googleLogin(accessToken) {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
  });
  const data = await res.json();

  if (data.success) {
    saveToken(data.data);
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

// Kiểm tra user hiện tại có phải admin không
// Lưu ý: role có trong localStorage từ response login — user đăng nhập trước
// khi có tính năng role cần đăng nhập lại để localStorage cập nhật
export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.role === "ADMIN";
};

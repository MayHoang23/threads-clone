const BASE_URL = "http://localhost:5000/api/v1";

// ========================
// HÀM GỌI API TRUNG TÂM
// ========================
// Tự động đính kèm token và xử lý refresh khi token hết hạn
export async function fetchAPI(endpoint, options = {}) {
  const accessToken =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  // Nếu access token hết hạn (401) → thử làm mới rồi gọi lại request
  if (res.status === 401 && accessToken) {
    const refreshed = await tryRefreshToken();

    if (refreshed) {
      const newToken = localStorage.getItem("accessToken");
      const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
      const retryData = await retryRes.json();
      if (!retryRes.ok) {
        const err = new Error(retryData?.message || "Lỗi không xác định");
        err.status = retryRes.status;
        err.data = retryData;
        throw err;
      }
      return retryData;
    } else {
      // Refresh thất bại → xóa token, đá về trang login
      clearAuthData();
      window.location.href = "/login";
      return;
    }
  }

  // Throw error có status cho các response lỗi khác (422, 429, 400, 403, v.v.)
  if (!res.ok) {
    const err = new Error(data?.message || "Lỗi không xác định");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ========================
// LÀM MỚI ACCESS TOKEN
// ========================
async function tryRefreshToken() {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("accessToken", data.data.accessToken);
      // Cập nhật cookie để middleware biết vẫn đang đăng nhập
      document.cookie = `accessToken=${data.data.accessToken}; path=/; max-age=${15 * 60}`;
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

// Xóa toàn bộ dữ liệu auth
function clearAuthData() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  document.cookie = "accessToken=; path=/; max-age=0";
}

import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

// Singleton socket — chỉ tạo 1 kết nối duy nhất trong toàn app
let socket = null;

// Kết nối socket với JWT token
// Gọi khi user đã đăng nhập và cần nhận real-time notification
export const connectSocket = (token) => {
  if (socket?.connected) return socket; // Đã kết nối rồi → dùng lại

  socket = io(SOCKET_URL, {
    auth: { token }, // Server dùng token này để xác thực và biết userId
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => console.log("[Socket] Đã kết nối:", socket.id));
  socket.on("connect_error", (err) => console.warn("[Socket] Lỗi kết nối:", err.message));

  return socket;
};

// Ngắt kết nối và reset singleton — gọi khi user đăng xuất
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Lấy instance hiện tại (có thể null nếu chưa connect)
export const getSocket = () => socket;

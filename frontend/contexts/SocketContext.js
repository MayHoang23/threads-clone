"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { connectSocket } from "@/lib/socket";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Dùng refreshToken (7 ngày) thay vì accessToken (15 phút)
    // tránh socket bị disconnect liên tục khi accessToken hết hạn
    const token = localStorage.getItem("refreshToken");
    if (!token) return;
    const instance = connectSocket(token);
    setSocket(instance);
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

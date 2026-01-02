'use client';
import { useEffect } from 'react';

export default function AuthGuard() {
  useEffect(() => {
    // 1. Check immediately on mount
    checkAuth();

    // 2. Check periodically (every 30 seconds)
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // If no token, maybe on login page, ignore

    try {
        // Fetch 'me' or just verify a protected endpoint
        // Assuming your backend has a GET /users/me or we just use GET /users/ID
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        const res = await fetch(`http://localhost:3000/users/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // IF 401 (Unauthorized) or 403 (Forbidden) -> KICK
        if (res.status === 401 || res.status === 403) {
            console.error("Session invalid. Logging out.");
            forceLogout();
            return;
        }

        const data = await res.json();
        // IF STATUS IS DISABLED -> KICK
        if (data.status === 'DISABLED') {
            console.error("Account Disabled. Logging out.");
            forceLogout();
        }

    } catch (e) {
        // Network errors: Do nothing (don't kick user just because wifi blinked)
    }
  };

  const forceLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return null; // This component renders nothing
}
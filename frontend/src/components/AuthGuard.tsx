'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();

    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  const checkAuth = async () => {
    // 1. IGNORE PUBLIC PAGES (Fixes the Refresh Loop)
    // If we are already on login or password pages, stop checking.
    if (pathname === '/login' || pathname.startsWith('/reset-password') || pathname.startsWith('/forgot-password')) {
        setAuthorized(true);
        return;
    }

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // 2. CHECK LOGIN
    if (!token || !userStr) {
      console.warn("⛔ No session found. Redirecting to login.");
      // Use router.push instead of window.location to prevent full reload loops
      router.push('/login'); 
      return;
    }

    const user = JSON.parse(userStr);

    // 3. CHECK ROLES
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        console.warn(`⛔ Access Denied: ${user.role} cannot access this page.`);
        router.push('/dashboard');
        return;
      }
    }

    // 4. CHECK SERVER STATUS (Heartbeat)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (data.status === 'DISABLED') {
        localStorage.clear();
        router.push('/login');
        return;
      }

      setAuthorized(true);

    } catch (e) {
      // If network error, just let them stay (don't kick)
      setAuthorized(true);
    }
  };

  // If used as a wrapper (Team Page), hide content until authorized
  if (children) {
    if (!authorized) return null; 
    return <>{children}</>;
  }

  // If used as background watcher (Layout), render nothing
  return null;
}
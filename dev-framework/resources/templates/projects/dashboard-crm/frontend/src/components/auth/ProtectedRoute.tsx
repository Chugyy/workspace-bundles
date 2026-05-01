'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ProtectedRoute Component
 *
 * Wrapper for client-side authentication protection.
 * Checks for auth_token in localStorage and redirects to /login if missing.
 *
 * Usage:
 *   <ProtectedRoute>
 *     <YourProtectedPage />
 *   </ProtectedRoute>
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, [router]);

  // Show nothing while checking authentication
  // This prevents flash of protected content
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

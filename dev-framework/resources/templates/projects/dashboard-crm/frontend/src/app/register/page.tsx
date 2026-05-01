'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// DISABLED — registration is closed, redirect to login
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}

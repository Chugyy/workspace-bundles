'use client';

import { useRouter } from 'next/navigation';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  const router = useRouter();

  return (
    <div
      className={`text-2xl font-bold text-primary cursor-pointer ${className}`}
      onClick={() => router.push('/leads')}
    >
      Simple CRM
    </div>
  );
}

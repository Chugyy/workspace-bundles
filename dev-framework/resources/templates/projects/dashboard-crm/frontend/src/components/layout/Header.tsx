'use client';

import { Logo } from './Logo';
import { UserMenu } from './UserMenu';
import { useUser, getUserId } from '@/services/user';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function Header() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    setUserId(getUserId());
  }, []);

  const { data: user, isLoading, isError } = useUser(userId || 0);

  useEffect(() => {
    if (isError) {
      toast.error('Erreur de chargement du profil');
      router.push('/login');
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <header className="h-16 border-b bg-background flex items-center px-6">
        <Logo />
        <div className="ml-auto w-10 h-10 bg-muted rounded-full animate-pulse" />
      </header>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <header className="h-16 border-b bg-background flex items-center px-6">
      <Logo />
      <div className="ml-auto">
        <UserMenu userName={user.name || ''} userEmail={user.email} />
      </div>
    </header>
  );
}

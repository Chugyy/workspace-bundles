/**
 * EXAMPLE - Usage des services user
 * Ce fichier montre comment utiliser les hooks d'authentification
 *
 * NOTE: Ce fichier est un exemple, ne pas l'importer dans l'application
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLogin, useRegister, useLogout, useUser } from './index';
import type { LoginRequest, RegisterRequest } from './types';

// ===================================
// EXEMPLE 1: Login Component
// ===================================

export function LoginExample() {
  const router = useRouter();
  const { mutate: login, isLoading, error } = useLogin();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(formData, {
      onSuccess: (data) => {
        console.log('Login successful:', data.userId);
        router.push('/leads');
      },
      onError: (err) => {
        console.error('Login failed:', err.message);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
    </form>
  );
}

// ===================================
// EXEMPLE 2: Register Component
// ===================================

export function RegisterExample() {
  const router = useRouter();
  const { mutate: register, isLoading, error } = useRegister();
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(
      {
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
      },
      {
        onSuccess: (data) => {
          console.log('Registration successful:', data.userId);
          router.push('/leads');
        },
        onError: (err) => {
          console.error('Registration failed:', err.message);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Password (min 8 chars)"
        required
        minLength={8}
      />
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name (optional)"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Register'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
    </form>
  );
}

// ===================================
// EXEMPLE 3: User Profile Component
// ===================================

export function UserProfileExample({ userId }: { userId: number }) {
  const { data: user, isLoading, error, refetch } = useUser(userId);

  if (isLoading) {
    return <div>Loading user profile...</div>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>Error: {error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1>{user?.name || 'Anonymous'}</h1>
      <p>Email: {user?.email}</p>
      <p>Account created: {user?.createdAt}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}

// ===================================
// EXEMPLE 4: Header with Logout
// ===================================

export function HeaderExample({ userId }: { userId: number }) {
  const router = useRouter();
  const { data: user } = useUser(userId);
  const { mutate: logout, isLoading: isLoggingOut } = useLogout();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        console.log('Logged out successfully');
        router.push('/login');
      },
      onError: (err) => {
        console.error('Logout failed:', err.message);
      },
    });
  };

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
      <div>Welcome, {user?.name || user?.email}</div>
      <button onClick={handleLogout} disabled={isLoggingOut}>
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </button>
    </header>
  );
}

// ===================================
// EXEMPLE 5: Protected Route Check
// ===================================

import { useEffect } from 'react';
import { getToken } from './service';

export function ProtectedPageExample({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = getToken();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  if (!token) {
    return <div>Redirecting to login...</div>;
  }

  return <>{children}</>;
}

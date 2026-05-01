# User Services - Authentication

Services TypeScript pour l'authentification utilisateur (register, login, getUserById).

## Structure

```
user/
├── types.ts      # Interfaces TypeScript (User, RegisterRequest, LoginRequest, Token)
├── service.ts    # Fonctions fetch + gestion token JWT
├── hooks.ts      # Custom hooks React (useRegister, useLogin, useLogout, useUser)
└── index.ts      # Exports centralisés
```

## Types

### User
```typescript
interface User {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### RegisterRequest
```typescript
interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}
```

### LoginRequest
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

### Token
```typescript
interface Token {
  accessToken: string;
  tokenType: string;
  userId: number;
}
```

## Services

### register(data: RegisterRequest): Promise<Token>
- Endpoint: `POST /api/auth/register`
- Crée un compte utilisateur
- Retourne un token JWT

### login(data: LoginRequest): Promise<Token>
- Endpoint: `POST /api/auth/login`
- Authentifie un utilisateur
- Retourne un token JWT

### getUserById(id: number): Promise<User>
- Endpoint: `GET /api/users/{id}`
- Récupère les données utilisateur
- Requiert un token JWT valide

### storeToken(token: string): void
- Stocke le token JWT dans localStorage (clé: 'auth_token')

### getToken(): string | null
- Récupère le token JWT depuis localStorage

### removeToken(): void
- Supprime le token JWT (logout)

## Hooks

### useRegister()
```typescript
const { mutate, isLoading, error, isSuccess } = useRegister();

mutate(
  { email: 'user@example.com', password: 'password123', name: 'John Doe' },
  {
    onSuccess: (data) => {
      console.log('User registered:', data.userId);
      // Token automatically stored in localStorage
      router.push('/leads');
    },
    onError: (error) => {
      console.error('Registration failed:', error.message);
    }
  }
);
```

### useLogin()
```typescript
const { mutate, isLoading, error, isSuccess } = useLogin();

mutate(
  { email: 'user@example.com', password: 'password123' },
  {
    onSuccess: (data) => {
      console.log('User logged in:', data.userId);
      // Token automatically stored in localStorage
      router.push('/leads');
    },
    onError: (error) => {
      console.error('Login failed:', error.message);
    }
  }
);
```

### useLogout()
```typescript
const { mutate, isLoading } = useLogout();

mutate(undefined, {
  onSuccess: () => {
    console.log('User logged out');
    router.push('/login');
  }
});
```

### useUser(id: number)
```typescript
const { data: user, isLoading, error, refetch } = useUser(userId);

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

return (
  <div>
    <h1>{user?.name}</h1>
    <p>{user?.email}</p>
  </div>
);
```

## Usage Examples

### Login Page
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/services/user';

export default function LoginPage() {
  const router = useRouter();
  const { mutate, isLoading, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(
      { email, password },
      {
        onSuccess: () => router.push('/leads'),
        onError: (err) => alert(err.message)
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

### Register Page
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegister } from '@/services/user';

export default function RegisterPage() {
  const router = useRouter();
  const { mutate, isLoading, error } = useRegister();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(
      { email, password, name: name || undefined },
      {
        onSuccess: () => router.push('/leads'),
        onError: (err) => alert(err.message)
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (optional)"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Register'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

### Protected Route (Header with User Info)
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/services/user';
import { useUser, useLogout } from '@/services/user';

export default function Header() {
  const router = useRouter();
  const token = getToken();
  const userId = token ? 1 : 0; // Extract userId from JWT (decode token)
  const { data: user, isLoading } = useUser(userId);
  const { mutate: logout } = useLogout();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => router.push('/login')
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <header>
      <div>Welcome, {user?.name || user?.email}</div>
      <button onClick={handleLogout}>Logout</button>
    </header>
  );
}
```

## API Configuration

Le base URL de l'API est configuré via variable d'environnement :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Si non définie, utilise `http://localhost:8000` par défaut.

## Error Handling

Toutes les erreurs sont propagées avec le format :
```typescript
{
  message: string; // Error message from API or default message
}
```

Statuts HTTP gérés :
- `201 Created` - Register success
- `200 OK` - Login success / User fetched
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid credentials / Missing token
- `403 Forbidden` - Access denied
- `404 Not Found` - User not found
- `409 Conflict` - Email already exists
- `500 Internal Server Error` - Server error

## Notes

- **Token storage:** localStorage avec clé 'auth_token'
- **Auto-login:** Register retourne un token JWT (auto-login après inscription)
- **Protected routes:** Vérifier `getToken()` avant d'afficher contenu protégé
- **Token expiration:** Gérer 401 Unauthorized pour rediriger vers /login
- **React Query:** Hooks actuellement implémentés avec `useState` (custom logic). Migration vers @tanstack/react-query recommandée pour cache/invalidation automatiques.

import { fetchWithAuth } from '@/lib/apiClient';
import type {
  User,
  RegisterRequest,
  LoginRequest,
  Token,
} from './types';

// ===================================
// CONFIG
// ===================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AUTH_BASE_PATH = `${API_URL}/api/auth`;
const USERS_BASE_PATH = `${API_URL}/api/users`;

// ===================================
// QUERY KEYS
// ===================================

export const userKeys = {
  all: ['user'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

// ===================================
// SERVICES
// ===================================

/**
 * Enregistrer un nouvel utilisateur
 * Endpoint: POST /api/auth/register
 */
export async function register(data: RegisterRequest): Promise<Token> {
  const response = await fetch(`${AUTH_BASE_PATH}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to register' }));
    throw new Error(error.detail || 'Failed to register');
  }

  return response.json();
}

/**
 * Authentifier un utilisateur
 * Endpoint: POST /api/auth/login
 */
export async function login(data: LoginRequest): Promise<Token> {
  console.log('🌐 Login service called with:', { email: data.email });
  console.log('🌐 Calling URL:', `${AUTH_BASE_PATH}/login`);
  console.log('🌐 Request body:', JSON.stringify(data));

  const response = await fetch(`${AUTH_BASE_PATH}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  console.log('📥 Response status:', response.status);
  console.log('📥 Response ok:', response.ok);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to login' }));
    console.log('❌ Login failed with error:', error);
    throw new Error(error.detail || 'Failed to login');
  }

  const result = await response.json();
  console.log('✅ Login successful, response:', result);
  return result;
}

/**
 * Récupérer un utilisateur par ID
 * Endpoint: GET /api/users/{id}
 */
export async function getUserById(id: number): Promise<User> {
  const response = await fetchWithAuth(`${USERS_BASE_PATH}/${id}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch user' }));
    throw new Error(error.detail || `Failed to fetch user ${id}`);
  }

  return response.json();
}

/**
 * Stocker le token JWT et l'ID utilisateur dans localStorage
 */
export function storeToken(token: string, userId?: number): void {
  localStorage.setItem('auth_token', token);
  if (userId !== undefined) {
    localStorage.setItem('user_id', userId.toString());
  }
}

/**
 * Récupérer le token JWT depuis localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Récupérer l'ID utilisateur depuis localStorage
 */
export function getUserId(): number | null {
  const userId = localStorage.getItem('user_id');
  return userId ? parseInt(userId, 10) : null;
}

/**
 * Supprimer le token JWT et l'ID utilisateur de localStorage (logout)
 */
export function removeToken(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_id');
}

// ===================================
// TYPES - user
// ===================================

/**
 * Modèle principal User
 * Source: GET /api/users/{id} output
 */
export interface User {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request - Créer User (Register)
 * Source: POST /api/auth/register input
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

/**
 * Request - Authentification User (Login)
 * Source: POST /api/auth/login input
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response - Token JWT
 * Source: POST /api/auth/register output & POST /api/auth/login output
 */
export interface Token {
  accessToken: string;
  tokenType: string;
  userId: number;
}

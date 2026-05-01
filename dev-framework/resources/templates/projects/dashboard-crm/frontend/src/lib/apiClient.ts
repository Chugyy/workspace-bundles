/**
 * API Client with automatic authentication and 401 interceptor
 *
 * This wrapper automatically:
 * 1. Adds Authorization header with token from localStorage
 * 2. Intercepts 401 responses and redirects to /login
 * 3. Cleans up expired tokens
 *
 * Usage:
 *   const response = await fetchWithAuth('/api/leads', { method: 'GET' });
 */

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('auth_token')
    : null;

  console.log('🌐 fetchWithAuth called:', { url, hasToken: !!token });
  if (token) {
    console.log('🔑 Token from localStorage:', token.substring(0, 20) + '...');
  }

  // Merge headers with authentication
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  console.log('📤 Request headers:', headers);

  // Perform fetch request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Global 401 interceptor
  if (response.status === 401) {
    // Clear expired/invalid token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');

      // Redirect to login page
      window.location.href = '/login';
    }

    throw new Error('Unauthorized - Session expired');
  }

  return response;
}

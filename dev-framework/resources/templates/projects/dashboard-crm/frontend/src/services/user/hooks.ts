import { useState } from 'react';
import {
  register,
  login,
  getUserById,
  storeToken,
  removeToken,
} from './service';
import type {
  User,
  RegisterRequest,
  LoginRequest,
  Token,
} from './types';

// ===================================
// TYPES
// ===================================

interface MutationState<TData, TError = Error> {
  data: TData | null;
  error: TError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface QueryState<TData, TError = Error> {
  data: TData | null;
  error: TError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

// ===================================
// QUERY HOOKS (GET)
// ===================================

/**
 * Hook - Récupérer un utilisateur par ID
 * Usage: const { data: user, isLoading, error, refetch } = useUser(userId);
 */
export function useUser(id: number): QueryState<User> {
  const [state, setState] = useState<QueryState<User>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    refetch: async () => {},
  });

  const fetchUser = async () => {
    setState((prev) => ({ ...prev, isLoading: true, isError: false, error: null }));

    try {
      const user = await getUserById(id);
      setState({
        data: user,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
        refetch: fetchUser,
      });
    } catch (error) {
      setState({
        data: null,
        error: error as Error,
        isLoading: false,
        isSuccess: false,
        isError: true,
        refetch: fetchUser,
      });
    }
  };

  // Auto-fetch on mount si ID existe
  if (id && !state.data && !state.isLoading && !state.isError) {
    fetchUser();
  }

  return {
    ...state,
    refetch: fetchUser,
  };
}

// ===================================
// MUTATION HOOKS (POST)
// ===================================

/**
 * Hook - Enregistrer un nouvel utilisateur
 * Usage:
 * const { mutate, isLoading, error } = useRegister();
 * mutate({ email, password, name }, { onSuccess: (data) => { ... } });
 */
export function useRegister() {
  const [state, setState] = useState<MutationState<Token>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const mutate = async (
    data: RegisterRequest,
    options?: {
      onSuccess?: (data: Token) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setState({
      data: null,
      error: null,
      isLoading: true,
      isSuccess: false,
      isError: false,
    });

    try {
      const result = await register(data);

      // Stocker le token JWT et l'ID utilisateur dans localStorage
      storeToken(result.accessToken, result.userId);

      setState({
        data: result,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
      });

      options?.onSuccess?.(result);
    } catch (error) {
      setState({
        data: null,
        error: error as Error,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });

      options?.onError?.(error as Error);
    }
  };

  return {
    ...state,
    mutate,
  };
}

/**
 * Hook - Authentifier un utilisateur
 * Usage:
 * const { mutate, isLoading, error } = useLogin();
 * mutate({ email, password }, { onSuccess: (data) => { ... } });
 */
export function useLogin() {
  const [state, setState] = useState<MutationState<Token>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const mutate = async (
    data: LoginRequest,
    options?: {
      onSuccess?: (data: Token) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setState({
      data: null,
      error: null,
      isLoading: true,
      isSuccess: false,
      isError: false,
    });

    try {
      const result = await login(data);

      // Stocker le token JWT et l'ID utilisateur dans localStorage
      storeToken(result.accessToken, result.userId);

      setState({
        data: result,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
      });

      options?.onSuccess?.(result);
    } catch (error) {
      setState({
        data: null,
        error: error as Error,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });

      options?.onError?.(error as Error);
    }
  };

  return {
    ...state,
    mutate,
  };
}

/**
 * Hook - Déconnexion utilisateur
 * Usage:
 * const { mutate, isLoading } = useLogout();
 * mutate(undefined, { onSuccess: () => { ... } });
 */
export function useLogout() {
  const [state, setState] = useState<MutationState<void>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const mutate = async (
    _data?: void,
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setState({
      data: null,
      error: null,
      isLoading: true,
      isSuccess: false,
      isError: false,
    });

    try {
      // Supprimer le token de localStorage
      removeToken();

      setState({
        data: null,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
      });

      options?.onSuccess?.();
    } catch (error) {
      setState({
        data: null,
        error: error as Error,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });

      options?.onError?.(error as Error);
    }
  };

  return {
    ...state,
    mutate,
  };
}

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if user data exists in localStorage
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      if (storedUser && storedToken) {
        // Parse stored user data
        const userData = JSON.parse(storedUser);
        setUser(userData);

        // Verify token is still valid by fetching current user data
        try {
          const response = await authApi.getMe();
          if (response.success && response.data?.user) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        } catch (err) {
          // Token is invalid, clear stored data
          console.warn('Stored token is invalid, clearing auth data');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      // Clear any invalid stored data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authApi.login({ email, password, rememberMe });

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Store token if provided (some implementations use HTTP-only cookies)
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
      } else {
        throw new Error('Login failed. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      throw err; // Re-throw so the component can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (googleToken: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authApi.googleLogin(googleToken);

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Store token if provided
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
      } else {
        throw new Error('Google login failed. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google login failed. Please try again.';
      setError(errorMessage);
      throw err; // Re-throw so the component can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Call logout API (this clears HTTP-only cookies)
      await authApi.logout();
    } catch (err) {
      console.error('Logout API error:', err);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear local state and storage
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setError(null);
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await authApi.refreshToken();
      
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      // If refresh fails, logout user
      await logout();
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    googleLogin,
    logout,
    refreshAuth,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
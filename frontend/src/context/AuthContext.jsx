import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getUser());
  const [token, setToken] = useState(() => {
    // Check if token passed in URL params from Google OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      localStorage.setItem('aether_token', urlToken);
      return urlToken;
    }
    return localStorage.getItem('aether_token');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clean up Google OAuth callback query params if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token')) {
      urlParams.delete('token');
      urlParams.delete('name');
      const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
      window.history.replaceState({}, document.title, window.location.pathname + newSearch);
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const profile = await authService.getMe();
          setUser(profile);
          localStorage.setItem('aether_user', JSON.stringify(profile));
        } catch (err) {
          console.error('Session validation error:', err);
          authService.logout();
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const signup = async (fullName, email, password) => {
    const data = await authService.signup(fullName, email, password);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

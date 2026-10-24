import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkUserAuth = useCallback(() => {
    setIsLoadingAuth(false);
    setAuthChecked(true);
  }, []);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
    setIsLoadingAuth(false);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setAuthError(null);
    setAuthChecked(true);
    setIsLoadingAuth(false);
  }, []);

  const simulateUnregistered = useCallback(() => {
    setIsAuthenticated(false);
    setAuthError({ type: 'user_not_registered' });
    setAuthChecked(true);
    setIsLoadingAuth(false);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoadingAuth,
      authChecked,
      authError,
      checkUserAuth,
      login,
      logout,
      setAuthError,
      simulateUnregistered,
    }),
    [
      isAuthenticated,
      isLoadingAuth,
      authChecked,
      authError,
      checkUserAuth,
      login,
      logout,
      simulateUnregistered,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

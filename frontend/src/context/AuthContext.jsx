import { createContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('userContext');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.token) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('userContext');
        }
      } catch {
        localStorage.removeItem('userContext');
      }
    }
    setLoading(false);
  }, []);

  const loginSession = (userData) => {
    localStorage.setItem('userContext', JSON.stringify(userData));
    setUser(userData);
  };

  const logoutSession = () => {
    localStorage.removeItem('userContext');
    setUser(null);
  };

  useEffect(() => {
    window.addEventListener('auth:unauthorized', logoutSession);
    return () => window.removeEventListener('auth:unauthorized', logoutSession);
  }, []);

  const value = useMemo(() => ({ user, loading, loginSession, logoutSession }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

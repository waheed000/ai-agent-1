import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, [location]);

  const login = (token: string) => {
    localStorage.setItem('auth_token', token);
    setIsAuthenticated(true);
    setLocation('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setLocation('/login');
  };

  return { isAuthenticated, login, logout };
}
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === 'undefined') {
        console.log('AuthContext: Running on server, skipping checkAuth');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('AuthContext: No token found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:5050/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('AuthContext: /api/auth/me failed', errorData.message || 'Unknown error', { status: response.status });
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('AuthContext: Failed to fetch user', error.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login with', { email });
      const response = await fetch('http://localhost:5050/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('AuthContext: Login response status', response.status);
      if (response.ok) {
        const { token, user } = await response.json();
        console.log('AuthContext: Login successful, user:', user);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        await router.push('/');
        console.log('AuthContext: Redirected to /dashboard');
        return { success: true };
      } else {
        const data = await response.json();
        console.error('AuthContext: Login failed', data.message);
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('AuthContext: Login error', error.message);
      return { success: false, message: 'An error occurred during login' };
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
      <AuthContext.Provider value={{ user, loading, login, logout }}>
        {children}
      </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  // Used by Google Sign-In — token and user already returned by backend
  const loginWithToken = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  // Join an existing farm with an invite code
  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  // Create a new farm; the registering user becomes its manager
  const registerFarm = async (formData) => {
    const { data } = await api.post('/auth/register-farm', formData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  // Signed-in user without a farm (e.g. new Google account): create a farm or redeem an invite
  const onboard = async (payload) => {
    const { data } = await api.post('/auth/onboard', payload);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isWorker = user?.role === 'worker';
  const isAdmin = user?.role === 'admin';
  const isViewOnly = !!user?.viewOnly;
  const farm = user?.farm || null; // { id, name } — null for admins and users still onboarding
  const needsOnboarding = !!user?.needsOnboarding;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginWithToken,
      logout,
      register,
      registerFarm,
      onboard,
      farm,
      needsOnboarding,
      isManager,
      isWorker,
      isAdmin,
      isViewOnly
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
import { useState, useEffect } from 'react';

// TODO(auth): Swap this fallback hook with the team's shared AuthContext once Dhrumil's auth module merges.
export const useAuth = () => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || localStorage.getItem('cc_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user') || localStorage.getItem('cc_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Dev default user for local testing only
    if (import.meta.env.DEV) {
      return {
        _id: '6acdfd0719912f0a2a3b070a',
        name: 'Nishka Shah',
        email: 'nishka@campus.edu',
        role: 'Student'
      };
    }
    return null;
  });

  useEffect(() => {
    if (import.meta.env.DEV && !token && user) {
      // In dev environment, set x-dev-user header automatically if no JWT token exists
      localStorage.setItem('devUser', JSON.stringify({ id: user._id || user.id, role: user.role, name: user.name || user.profile?.name }));
    }
  }, [token, user]);

  const loginAs = (customUser, customToken = '') => {
    setUser(customUser);
    localStorage.setItem('user', JSON.stringify(customUser));
    if (customToken) {
      setToken(customToken);
      localStorage.setItem('token', customToken);
      localStorage.removeItem('devUser');
    } else {
      localStorage.setItem('devUser', JSON.stringify({ id: customUser._id, role: customUser.role, name: customUser.name }));
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('devUser');
  };

  return {
    user,
    token,
    isAuthenticated: Boolean(user || token),
    loginAs,
    logout,
  };
};

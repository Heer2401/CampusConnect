import { useState, useEffect } from 'react';

// TODO(auth): Swap this fallback hook with the team's shared AuthContext once Dhrumil's auth module merges.
export const useAuth = () => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Dev default user for local testing
    return {
      _id: '64f1a2b3c4d5e6f7a8b9c099',
      name: 'Nishka Shah',
      email: 'nishka@campus.edu',
      role: 'Student'
    };
  });

  useEffect(() => {
    if (!token && user) {
      // In dev environment, set x-dev-user header automatically if no JWT token exists
      localStorage.setItem('devUser', JSON.stringify({ id: user._id, role: user.role, name: user.name }));
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

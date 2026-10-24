import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roleRequired }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Authenticating session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'Admin' || user.role === 'Administrator';

  // Admin trying to access student-only routes -> redirect to Admin Console
  if (roleRequired === 'student' && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Student trying to access admin-only routes -> redirect to Marketplace
  if (roleRequired === 'admin' && !isAdmin) {
    return <Navigate to="/marketplace" replace />;
  }

  return children;
}

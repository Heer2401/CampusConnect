import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import SustainabilityPage from './pages/SustainabilityPage';

function RootRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/profile" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<AuthPage />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment-methods"
                element={
                  <ProtectedRoute>
                    <PaymentMethodsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sustainability"
                element={
                  <ProtectedRoute>
                    <SustainabilityPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

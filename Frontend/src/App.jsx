import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './features/search_communication/context/SocketContext';
import { WishlistProvider } from './features/search_communication/context/WishlistContext';
import { NotificationProvider } from './features/search_communication/context/NotificationContext';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Dhrumil Doshi — Student Auth, Profile & Sustainability Pages
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import SustainabilityPage from './pages/SustainabilityPage';

// Team Modules — Marketplace, Communication & Admin
import { BrowseListingsPage } from './features/marketplace/pages/BrowseListingsPage';
import { CreateListingPage } from './features/marketplace/pages/CreateListingPage';
import { EditListingPage } from './features/marketplace/pages/EditListingPage';
import { ListingDetailPage } from './features/marketplace/pages/ListingDetailPage';
import { MyListingsPage } from './features/marketplace/pages/MyListingsPage';
import './features/marketplace/marketplace.css';
import { ChatPage } from './features/search_communication/pages/ChatPage';
import { WishlistPage } from './features/search_communication/pages/WishlistPage';
import RequestsPage from './features/search_communication/pages/RequestsPage';
import AdminDashboard from './components/admin/AdminDashboard';

// Charmi Bhayani — Rental & Transaction Management
import RentalsPage from './features/rental/pages/RentalsPage';
import TransactionsPage from './features/rental/pages/TransactionsPage';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const isAdmin = user.role === 'Admin' || user.role === 'Administrator';
  return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/marketplace" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <WishlistProvider>
            <NotificationProvider>
              <div className="app-container">
                <Navbar />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<AuthPage />} />

                    {/* Student Account & Sustainability */}
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/payment-methods"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <PaymentMethodsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/sustainability"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <SustainabilityPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Marketplace Listings (Student Only) */}
                    <Route
                      path="/marketplace"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <BrowseListingsPage />
                        </ProtectedRoute>
                      }
                    />
                    {/* AI Listing Generator — Heer Patel (alias: /create → /marketplace/create) */}
                    <Route
                      path="/create"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <CreateListingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/marketplace/create"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <CreateListingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/listings/new"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <CreateListingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/browse" element={<Navigate to="/marketplace" replace />} />
                    <Route
                      path="/marketplace/edit/:id"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <EditListingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/listings/:id/edit"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <EditListingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/marketplace/:id"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <ListingDetailPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/listings/:id"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <ListingDetailPage />
                        </ProtectedRoute>
                      }
                    />
                    {/* AI Draft Review — Heer Patel */}
                    <Route
                      path="/my-listings"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <MyListingsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Chat & Wishlist (Student Only) */}
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <ChatPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/wishlist"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <WishlistPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* ── Requests Board (Student Only) */}
                    <Route
                      path="/requests"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <RequestsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* ── Rentals Tracker (Student Only) */}
                    <Route
                      path="/rentals"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <RentalsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* ── Transactions Page (Student Only) */}
                    <Route
                      path="/transactions"
                      element={
                        <ProtectedRoute roleRequired="student">
                          <TransactionsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Legacy redirects */}
                    <Route
                      path="/dashboard"
                      element={<Navigate to="/transactions" replace />}
                    />

                    {/* Admin Dashboard (Administrator Only) */}
                    <Route
                      path="/admin/*"
                      element={
                        <ProtectedRoute roleRequired="admin">
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </NotificationProvider>
          </WishlistProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

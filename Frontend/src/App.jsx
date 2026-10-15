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
import { ChatPage } from './features/search_communication/pages/ChatPage';
import { WishlistPage } from './features/search_communication/pages/WishlistPage';
import AdminDashboard from './components/admin/AdminDashboard';

// Charmi Bhayani — Rental & Transaction Management
import RentalDashboardPage from './features/rental/pages/RentalDashboardPage';

function RootRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/marketplace" replace /> : <Navigate to="/login" replace />;
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

                    {/* Marketplace Listings */}
                    <Route
                      path="/marketplace"
                      element={
                        <ProtectedRoute>
                          <BrowseListingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/marketplace/create"
                      element={
                        <ProtectedRoute>
                          <CreateListingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/marketplace/edit/:id"
                      element={
                        <ProtectedRoute>
                          <EditListingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/marketplace/:id"
                      element={
                        <ProtectedRoute>
                          <ListingDetailPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-listings"
                      element={
                        <ProtectedRoute>
                          <MyListingsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Chat & Wishlist */}
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute>
                          <ChatPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/wishlist"
                      element={
                        <ProtectedRoute>
                          <WishlistPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Rental & Transaction Dashboard */}
                    <Route
                      path="/rentals"
                      element={
                        <ProtectedRoute>
                          <RentalDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin Dashboard */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute>
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

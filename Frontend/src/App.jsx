import React from 'react';
import { Routes, Route, NavLink, Navigate, Link } from 'react-router-dom';
import { BrowseListingsPage } from './features/marketplace/pages/BrowseListingsPage';
import { CreateListingPage } from './features/marketplace/pages/CreateListingPage';
import { EditListingPage } from './features/marketplace/pages/EditListingPage';
import { ListingDetailPage } from './features/marketplace/pages/ListingDetailPage';
import { MyListingsPage } from './features/marketplace/pages/MyListingsPage';
import { WishlistPage } from './features/search_communication/pages/WishlistPage';
import { ChatPage } from './features/search_communication/pages/ChatPage';
import { NotificationBell } from './features/search_communication/components/NotificationBell';

import { useAuth } from './features/marketplace/hooks/useAuth';
import { SocketProvider } from './features/search_communication/context/SocketContext';
import { WishlistProvider, useWishlist } from './features/search_communication/context/WishlistContext';
import { NotificationProvider } from './features/search_communication/context/NotificationContext';

const Topbar = () => {
  const { user } = useAuth();
  const { wishlistCount } = useWishlist();

  return (
    <header className="topbar">
      <Link to="/browse" className="brand">
        <span className="dot" />
        CampusConnect
      </Link>
      <nav>
        <NavLink to="/browse" className={({ isActive }) => (isActive ? 'active' : '')}>
          Browse
        </NavLink>
        <NavLink to="/listings/new" className={({ isActive }) => (isActive ? 'active' : '')}>
          New Listing
        </NavLink>
        <NavLink to="/my-listings" className={({ isActive }) => (isActive ? 'active' : '')}>
          My Listings
        </NavLink>
        <NavLink to="/wishlist" className={({ isActive }) => (isActive ? 'active' : '')}>
          Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => (isActive ? 'active' : '')}>
          Chats
        </NavLink>
        <span style={{ color: '#64748b', cursor: 'not-allowed' }}>Rentals</span>
      </nav>
      <div className="user" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <NotificationBell />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar">
            {user?.name?.slice(0, 2).toUpperCase() || 'HS'}
          </div>
          <span>{user?.name || 'Student'}</span>
        </div>
      </div>
    </header>
  );
};

export const App = () => {
  return (
    <SocketProvider>
      <WishlistProvider>
        <NotificationProvider>
          <div>
            <Topbar />

            {/* Main Routed Content */}
            <main>
              <Routes>
                <Route path="/" element={<Navigate to="/browse" replace />} />
                <Route path="/browse" element={<BrowseListingsPage />} />
                <Route path="/listings/new" element={<CreateListingPage />} />
                <Route path="/listings/:id" element={<ListingDetailPage />} />
                <Route path="/listings/:id/edit" element={<EditListingPage />} />
                <Route path="/my-listings" element={<MyListingsPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/chat" element={<ChatPage />} />
              </Routes>
            </main>
          </div>
        </NotificationProvider>
      </WishlistProvider>
    </SocketProvider>
  );
};

export default App;

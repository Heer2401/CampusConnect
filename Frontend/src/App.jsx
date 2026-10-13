import React from 'react';
import { Routes, Route, NavLink, Navigate, Link } from 'react-router-dom';
import { BrowseListingsPage } from './features/marketplace/pages/BrowseListingsPage';
import { CreateListingPage } from './features/marketplace/pages/CreateListingPage';
import { EditListingPage } from './features/marketplace/pages/EditListingPage';
import { ListingDetailPage } from './features/marketplace/pages/ListingDetailPage';
import { MyListingsPage } from './features/marketplace/pages/MyListingsPage';
import { useAuth } from './features/marketplace/hooks/useAuth';

export const App = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* Topbar Matching Approved Mockup */}
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
          <span style={{ color: '#64748b', cursor: 'not-allowed' }}>Rentals</span>
          <span style={{ color: '#64748b', cursor: 'not-allowed' }}>Chats</span>
        </nav>
        <div className="user">
          <div className="avatar">
            {user?.name?.slice(0, 2).toUpperCase() || 'NS'}
          </div>
          <span>{user?.name || 'Student'}</span>
        </div>
      </header>

      {/* Main Routed Content */}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/browse" replace />} />
          <Route path="/browse" element={<BrowseListingsPage />} />
          <Route path="/listings/new" element={<CreateListingPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/listings/:id/edit" element={<EditListingPage />} />
          <Route path="/my-listings" element={<MyListingsPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

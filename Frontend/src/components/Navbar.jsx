import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, CreditCard, Leaf, LogOut, ShoppingBag, Heart, MessageSquare, ShieldCheck, Package } from 'lucide-react';
import { NotificationBell } from '../features/search_communication/components/NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        <NavLink to="/marketplace" className="brand-wrapper">
          <div className="brand-logo-icon">CC</div>
          <div>
            <div className="brand-name">CampusConnect</div>
            <span className="brand-subtitle">Smart Campus Exchange</span>
          </div>
        </NavLink>

        {user && (
          <nav className="nav-links">
            <NavLink
              to="/marketplace"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <ShoppingBag size={16} />
              Marketplace
            </NavLink>

            <NavLink
              to="/wishlist"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Heart size={16} />
              Wishlist
            </NavLink>

            <NavLink
              to="/chat"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <MessageSquare size={16} />
              Chat
            </NavLink>

            <NavLink
              to="/rentals"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Package size={16} />
              Rentals
            </NavLink>

            <NavLink
              to="/sustainability"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Leaf size={16} />
              Sustainability
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <User size={16} />
              Profile
            </NavLink>

            {user.role === 'Admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <ShieldCheck size={16} />
                Admin
              </NavLink>
            )}

            <NotificationBell />

            <div className="nav-user-badge">
              <span className="role-pill">
                {user.role || 'Student'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#E2E8F0', fontWeight: 500 }}>
                {user.profile?.name || user.name || user.email?.split('@')[0]}
              </span>
              <button onClick={handleLogout} className="btn-logout" title="Sign Out">
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

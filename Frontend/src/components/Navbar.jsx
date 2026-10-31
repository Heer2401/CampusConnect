import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  ClipboardList,
  Package,
  CreditCard,
  MessageSquare,
  Heart,
  Bell,
  ShieldCheck,
  User,
  Leaf,
  LogOut,
  BadgeCheck,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { NotificationBell } from '../features/search_communication/components/NotificationBell';

function getInitials(user) {
  const name = user?.profile?.name || user?.name;
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (user?.email) return user.email[0].toUpperCase();
  return 'U';
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAdmin = user && (user.role === 'Admin' || user.role === 'Administrator');
  const initials = user ? getInitials(user) : '';
  const displayName = user?.profile?.name || user?.name || user?.email?.split('@')[0] || 'Student';
  const email = user?.email || '';
  const isVerified = user?.isVerified || user?.verified || false;

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* ── Brand Logo (Left) ──────────────────────────────────────── */}
        <NavLink to={isAdmin ? '/admin' : '/marketplace'} className="brand-wrapper">
          <div className="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 8.5C17.8 5.8 15.1 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C15.5 20 18.5 17.8 19.5 14.6"
                stroke="white"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle cx="19" cy="8.5" r="2.2" fill="white" />
            </svg>
          </div>
          <div className="brand-text-col">
            <div className="brand-name">CampusConnect</div>
          </div>
        </NavLink>

        {/* ── Nav Links (Center) ────────────────────────────────────── */}
        {user && (
          <nav className="nav-links">
            {isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <ShieldCheck size={16} />
                Admin Console
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/marketplace"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Marketplace
                </NavLink>

                <NavLink
                  to="/requests"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Requests
                </NavLink>

                <NavLink
                  to="/rentals"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Rentals
                </NavLink>

                <NavLink
                  to="/transactions"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Transactions
                </NavLink>
              </>
            )}
          </nav>
        )}

        {/* ── Right Actions ─────────────────────────────────────────── */}
        {user && (
          <div className="nav-actions">
            {!isAdmin && (
              <>
                {/* Sell Button (+ Sell) for creating a new listing */}
                <NavLink
                  to="/marketplace/create"
                  className="nav-sell-btn"
                  title="Create listing"
                >
                  <Plus size={16} />
                  <span>Sell</span>
                </NavLink>

                {/* Chat Messages */}
                <NavLink
                  to="/chat"
                  className={({ isActive }) =>
                    `nav-icon-btn ${isActive ? 'nav-icon-btn--active' : ''}`
                  }
                  title="Messages"
                >
                  <MessageSquare size={18} />
                </NavLink>

                {/* Notification Bell */}
                <NotificationBell />

                {/* Wishlist Heart Icon */}
                <NavLink
                  to="/wishlist"
                  className={({ isActive }) =>
                    `nav-icon-btn ${isActive ? 'nav-icon-btn--active' : ''}`
                  }
                  title="Wishlist"
                >
                  <Heart size={18} />
                </NavLink>
              </>
            )}

            {/* Profile Avatar + Dropdown */}
            <div className="nav-profile-wrapper" ref={dropdownRef}>
              <button
                className="nav-avatar-btn"
                onClick={() => setProfileOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
                title="Account"
              >
                <span className="nav-avatar">{initials}</span>
                <ChevronDown size={14} className="nav-avatar-chevron" />
              </button>

              {profileOpen && (
                <div className="nav-dropdown">
                  {/* User Info Header */}
                  <div className="nav-dropdown-header">
                    <div className="nav-dropdown-avatar">{initials}</div>
                    <div className="nav-dropdown-info">
                      <div className="nav-dropdown-name">{displayName}</div>
                      <div className="nav-dropdown-email">{email}</div>
                      <div className="nav-dropdown-badges">
                        <span className="nav-badge nav-badge-role">
                          {isAdmin ? 'Admin' : 'Student'}
                        </span>
                        {isVerified && (
                          <span className="nav-badge nav-badge-verified">
                            <BadgeCheck size={11} />
                            Verified student
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="nav-dropdown-divider" />

                  {/* Menu Items */}
                  {!isAdmin && (
                    <>
                      <NavLink
                        to="/profile"
                        className="nav-dropdown-item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User size={15} />
                        Profile
                      </NavLink>
                      <NavLink
                        to="/sustainability"
                        className="nav-dropdown-item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Leaf size={15} />
                        Sustainability
                      </NavLink>
                    </>
                  )}

                  <div className="nav-dropdown-divider" />

                  <button className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, CreditCard, Leaf, LogOut, ShieldCheck } from 'lucide-react';

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
        <NavLink to="/profile" className="brand-wrapper">
          <div className="brand-logo-icon">CC</div>
          <div>
            <div className="brand-name">CampusConnect</div>
            <span className="brand-subtitle">Smart Campus Exchange</span>
          </div>
        </NavLink>

        {user && (
          <nav className="nav-links">
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <User size={16} />
              Profile
            </NavLink>

            <NavLink
              to="/payment-methods"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <CreditCard size={16} />
              Payment Methods
            </NavLink>

            <NavLink
              to="/sustainability"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Leaf size={16} />
              Sustainability
            </NavLink>

            <div className="nav-user-badge">
              <span className="role-pill">
                {user.role || 'Student'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#E2E8F0', fontWeight: 500 }}>
                {user.profile?.name || user.email?.split('@')[0]}
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

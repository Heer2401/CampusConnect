import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  MessageSquare,
  ShoppingBag,
  Package,
  CheckCircle2,
  XCircle,
  Sparkles,
  Tag,
  CreditCard,
} from 'lucide-react';

function renderNotifIcon(type) {
  switch (type) {
    case 'chat_message':
      return <MessageSquare size={16} color="#2563eb" />;
    case 'order':
      return <ShoppingBag size={16} color="#16a34a" />;
    case 'rental':
    case 'rental_reminder':
      return <Package size={16} color="#d97706" />;
    case 'listing_approved':
      return <CheckCircle2 size={16} color="#16a34a" />;
    case 'listing_rejected':
      return <XCircle size={16} color="#dc2626" />;
    case 'match_found':
      return <Sparkles size={16} color="#8b5cf6" />;
    case 'price_alert':
      return <Tag size={16} color="#ea580c" />;
    case 'transaction_update':
      return <CreditCard size={16} color="#2563eb" />;
    default:
      return <Bell size={16} color="#64748b" />;
  }
}


const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    setIsOpen(false);

    // Contextual navigation
    if (notif.type === 'chat_message' && notif.relatedId) {
      navigate(`/chat?thread=${notif.relatedId}`);
    } else if (['order', 'transaction_update'].includes(notif.type)) {
      navigate('/transactions');
    } else if (notif.type === 'rental') {
      navigate('/rentals');
    } else if (['listing_approved', 'listing_rejected', 'price_alert', 'match_found'].includes(notif.type) && notif.relatedId) {
      navigate(`/listings/${notif.relatedId}`);
    } else if (notif.type === 'rental_reminder') {
      navigate('/rentals');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Button */}
      <button
        type="button"
        className="nav-icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '999px',
              fontSize: 9,
              fontWeight: 700,
              minWidth: 15,
              height: 15,
              padding: '0 3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid #0d1b2a'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 460,
            background: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafbfc'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
              Notifications {unreadCount > 0 && <span className="pill pill-blue" style={{ fontSize: 11, marginLeft: 6 }}>{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <Bell size={28} color="#94a3b8" />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>No notifications yet</div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  You'll be alerted here for chat messages, rental updates, and saved listings.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f8fafc',
                    display: 'flex',
                    gap: 12,
                    cursor: 'pointer',
                    background: notif.isRead ? '#ffffff' : '#f0f7ff',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {renderNotifIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: notif.isRead ? 600 : 700, fontSize: 13, color: '#1e293b' }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.35 }}>
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#2563eb',
                        flexShrink: 0,
                        alignSelf: 'center'
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

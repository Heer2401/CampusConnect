/**
 * Charmi Bhayani (202512028) — Rentals Tracker
 * RentalsPage.jsx
 *
 * Dedicated page to track items you have borrowed and items you are lending out.
 * Recreated to match the exact modern theme and card design:
 * - Top header with "RENTALS" tag and primary action button
 * - Stat row with 4 colored pastel cards
 * - Filter pills (Borrowing, Lending, Browse to rent) & status tabs (Active, History)
 * - Borrowed view: item thumbnail, pricing, date range, timeline progress bar, status pill, Chat & Return buttons
 * - Lending view: item thumbnail, borrower info, date range, status pill, days left, Confirm Return button
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ArrowUpRight,
  ArrowLeft,
  Clock,
  RotateCcw,
  Hourglass,
  Calendar,
  MoreVertical,
  MessageSquare,
  CheckCircle2,
  X,
  Check,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  getMyRentals,
  updateRentalStatus,
  getRentalQR,
  verifyHandover,
  completeRental,
} from '../../rental/api/rentalApi';
import { chatApi } from '../../search_communication/api/chatApi';

// ─── Date & Time Helpers ──────────────────────────────────────────────────────
const fmtMonthDay = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function getDaysLeft(dueDate) {
  if (!dueDate) return null;
  const target = new Date(dueDate);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function getRentalProgress(startDate, dueDate) {
  if (!startDate || !dueDate) return 50;
  const start = new Date(startDate).getTime();
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  if (due <= start) return 100;
  const pct = Math.round(((now - start) / (due - start)) * 100);
  return Math.min(100, Math.max(10, pct));
}

// ─── Status Configurations ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active: {
    label: 'Active',
    dot: '#10b981',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#bbf7d0',
  },
  duesoon: {
    label: 'Due soon',
    dot: '#d97706',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
  },
  approved: {
    label: 'Approved',
    dot: '#2563eb',
    color: '#1d4ed8',
    bg: '#dbeafe',
    border: '#bfdbfe',
  },
  requested: {
    label: 'Requested',
    dot: '#d97706',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
  },
  overdue: {
    label: 'Overdue',
    dot: '#ef4444',
    color: '#dc2626',
    bg: '#fee2e2',
    border: '#fecaca',
  },
  completed: {
    label: 'Completed',
    dot: '#94a3b8',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#e2e8f0',
  },
  cancelled: {
    label: 'Cancelled',
    dot: '#94a3b8',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#e2e8f0',
  },
};

const getStatusAndTimeline = (rental) => {
  const daysLeft = getDaysLeft(rental.dueDate);
  const isOverdue =
    rental.status === 'overdue' ||
    (rental.status === 'active' && daysLeft !== null && daysLeft < 0);
  const isDueSoon =
    rental.status === 'active' && daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

  let statusKey = rental.status;
  if (isOverdue) {
    statusKey = 'overdue';
  } else if (isDueSoon) {
    statusKey = 'duesoon';
  }

  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.active;

  let timelineLabel = '';
  let timelineColorClass = 'track-blue';

  if (isOverdue) {
    const overdueDays = Math.abs(daysLeft || 1);
    timelineLabel = `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`;
    timelineColorClass = 'track-red';
  } else if (isDueSoon) {
    timelineLabel =
      daysLeft === 0 ? 'Due today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
    timelineColorClass = 'track-green';
  } else if (daysLeft !== null && daysLeft > 2) {
    timelineLabel = `${daysLeft} days left`;
    timelineColorClass = 'track-blue';
  } else if (rental.status === 'approved') {
    timelineLabel = daysLeft !== null && daysLeft >= 0 ? `${daysLeft} days left` : 'Approved';
    timelineColorClass = 'track-blue';
  } else if (rental.status === 'completed') {
    timelineLabel = 'Completed';
    timelineColorClass = 'track-gray';
  } else if (rental.status === 'cancelled') {
    timelineLabel = 'Cancelled';
    timelineColorClass = 'track-gray';
  }

  return { statusCfg, timelineLabel, timelineColorClass, isOverdue, isDueSoon, daysLeft };
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`rd-toast rd-toast-${type}`}
      onClick={onClose}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      {type === 'success' ? <Check size={14} /> : <X size={14} />} {message}
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ rentalId, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getRentalQR(rentalId)
      .then(setQrData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [rentalId]);

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}>
          <X size={16} />
        </button>
        <h3 className="rd-modal-title">QR Handover Code</h3>
        {loading && <div className="rd-spinner" />}
        {error && <p className="rd-error-msg">{error}</p>}
        {qrData && (
          <>
            <img src={qrData.qrDataUri} alt="QR Code" className="rd-qr-img" />
            <p className="rd-qr-hint">
              Show this QR to the renter to scan and verify in-person handover.
            </p>
            <code className="rd-qr-token">{qrData.token}</code>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Scan QR Modal ─────────────────────────────────────────────────────────────
function ScanQRModal({ rentalId, onSuccess, onClose }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!token.trim()) {
      setError('Please enter the QR token.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyHandover(rentalId, token.trim());
      onSuccess('Handover verified! Rental is now active.');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}>
          <X size={16} />
        </button>
        <h3 className="rd-modal-title">Verify QR Handover</h3>
        <p className="rd-modal-sub">
          Enter the token displayed on the item owner's screen:
        </p>
        <input
          className="rd-input"
          placeholder="Paste or type QR token here..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          autoFocus
        />
        {error && <p className="rd-error-msg">{error}</p>}
        <button
          className="rd-btn rd-btn-primary"
          onClick={handleVerify}
          disabled={loading}
          style={{ marginTop: 12 }}
        >
          {loading ? 'Verifying...' : 'Verify Handover'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Rentals Page ──────────────────────────────────────────────────────────
export default function RentalsPage() {
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const navigate = useNavigate();

  const [view, setView] = useState('borrowing'); // 'borrowing' | 'lending'
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'history'
  const [allRentals, setAllRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showQRFor, setShowQRFor] = useState(null);
  const [scanQRFor, setScanQRFor] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyRentals();
      setAllRentals(res.rentals || []);
    } catch (e) {
      showToast(e.message || 'Failed to load rentals.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const borrowingRentals = useMemo(
    () =>
      allRentals.filter((r) => {
        const rId = r.renterId?._id || r.renterId?.id || r.renterId;
        return rId && userId && rId.toString() === userId.toString();
      }),
    [allRentals, userId]
  );

  const lendingRentals = useMemo(
    () =>
      allRentals.filter((r) => {
        const oId = r.ownerId?._id || r.ownerId?.id || r.ownerId;
        return oId && userId && oId.toString() === userId.toString();
      }),
    [allRentals, userId]
  );

  const currentList = useMemo(() => {
    const base = view === 'borrowing' ? borrowingRentals : lendingRentals;
    if (statusFilter === 'active') {
      return base.filter((r) =>
        ['requested', 'approved', 'active', 'overdue'].includes(r.status)
      );
    }
    return base.filter((r) => ['completed', 'cancelled'].includes(r.status));
  }, [view, statusFilter, borrowingRentals, lendingRentals]);

  // Counts for Stats
  const activeBorrowCount = borrowingRentals.filter((r) =>
    ['requested', 'approved', 'active', 'overdue'].includes(r.status)
  ).length;

  const activeLendCount = lendingRentals.filter((r) =>
    ['requested', 'approved', 'active', 'overdue'].includes(r.status)
  ).length;

  const activeLendingsStrict = lendingRentals.filter((r) => r.status === 'active').length;

  const dueSoonBorrowCount = borrowingRentals.filter((r) => {
    const days = getDaysLeft(r.dueDate);
    return days !== null && days <= 2 && days >= 0 && r.status === 'active';
  }).length;

  const dueSoonLendCount = lendingRentals.filter((r) => {
    const days = getDaysLeft(r.dueDate);
    return days !== null && days <= 2 && days >= 0 && r.status === 'active';
  }).length;

  const historyBorrowCount = borrowingRentals.filter((r) =>
    ['completed', 'cancelled'].includes(r.status)
  ).length;

  const historyLendCount = lendingRentals.filter((r) =>
    ['completed', 'cancelled'].includes(r.status)
  ).length;

  const handleStatusUpdate = async (id, status, msg) => {
    try {
      const res = await updateRentalStatus(id, status);
      showToast(msg);
      if (status === 'approved') {
        navigate('/transactions', {
          state: {
            transactionId: res?.transactionId,
            message: 'Rental approved! Use the 6-digit Meetup PIN for item handover.',
          },
        });
      } else {
        loadData();
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleConfirmReturn = async (id) => {
    try {
      await completeRental(id);
      showToast('Return confirmed! Rental marked as completed.');
      loadData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleChatWithCounterpart = async (rental) => {
    try {
      const counterpartId =
        view === 'borrowing'
          ? rental.ownerId?._id || rental.ownerId?.id || rental.ownerId
          : rental.renterId?._id || rental.renterId?.id || rental.renterId;
      const counterpartName =
        view === 'borrowing'
          ? rental.ownerId?.profile?.name || rental.ownerId?.name || 'Owner'
          : rental.renterId?.profile?.name || rental.renterId?.name || 'Renter';
      const listingId =
        rental.listingId?._id || rental.listingId?.id || rental.listingId;

      const res = await chatApi.createOrGetThread(listingId, counterpartId);
      const threadId = res?.data?._id;

      navigate(threadId ? `/chat?thread=${threadId}` : '/chat', {
        state: {
          threadId,
          recipientId: counterpartId,
          recipientName: counterpartName,
          itemName: rental.listingId?.title,
          initialDraft: `Hi! Reaching out about the rental for "${rental.listingId?.title || 'item'}".`,
        },
      });
    } catch (e) {
      navigate('/chat');
    }
  };

  return (
    <div className="rentals-page-wrapper">
      <div className="rentals-page-container">
        {toast.message && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ message: '' })}
          />
        )}

        {/* ── Top Header Section ─────────────────────────────────────────── */}
        <div className="rentals-page-header">
          <div>
            <span className="rentals-badge-tag">RENTALS</span>
            <h1 className="rentals-page-title">
              {view === 'borrowing' ? 'Borrowed items' : 'Lending'}
            </h1>
            <p className="rentals-page-subtitle">
              {view === 'borrowing'
                ? 'Track what you have borrowed and what you have lent.'
                : 'Track what you have lent and what to expect back.'}
            </p>
          </div>

          <div>
            {view === 'borrowing' ? (
              <button
                type="button"
                className="rentals-primary-btn"
                onClick={() => navigate('/marketplace?type=rent')}
              >
                <Package size={16} /> Browse rentals
              </button>
            ) : (
              <button
                type="button"
                className="rentals-primary-btn"
                onClick={() => navigate('/marketplace/create?type=rent')}
              >
                <Package size={16} /> List for rent
              </button>
            )}
          </div>
        </div>

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <div className="rentals-stat-row">
          {view === 'borrowing' ? (
            <>
              {/* Stat 1: Borrowing */}
              <div
                className={`rentals-stat-card card-mint ${statusFilter === 'active' ? 'active-card' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                <div className="rentals-stat-icon-box box-mint">
                  <Clock size={18} strokeWidth={2.4} />
                </div>
                <div className="rentals-stat-num">{activeBorrowCount}</div>
                <div className="rentals-stat-label">Borrowing</div>
              </div>

              {/* Stat 2: Lending */}
              <div
                className="rentals-stat-card card-blue"
                onClick={() => {
                  setView('lending');
                  setStatusFilter('active');
                }}
              >
                <div className="rentals-stat-icon-box box-blue">
                  <ArrowUpRight size={18} strokeWidth={2.4} />
                </div>
                <div className="rentals-stat-num">{activeLendCount}</div>
                <div className="rentals-stat-label">Lending</div>
              </div>

              {/* Stat 3: Due soon */}
              <div
                className="rentals-stat-card card-amber"
                onClick={() => setStatusFilter('active')}
              >
                <div className="rentals-stat-icon-box box-amber">
                  <Hourglass size={18} strokeWidth={2.4} />
                </div>
                <div className="rentals-stat-num">{dueSoonBorrowCount}</div>
                <div className="rentals-stat-label">Due soon</div>
              </div>

              {/* Stat 4: History */}
              <div
                className={`rentals-stat-card card-purple ${statusFilter === 'history' ? 'active-card' : ''}`}
                onClick={() => setStatusFilter('history')}
              >
                <div className="rentals-stat-icon-box box-purple">
                  <RotateCcw size={18} strokeWidth={2.4} />
                </div>
                <div className="rentals-stat-num">{historyBorrowCount}</div>
                <div className="rentals-stat-label">History</div>
              </div>
            </>
          ) : (
            <>
              {/* Stat 1: Lending */}
              <div
                className={`rentals-stat-card card-mint ${statusFilter === 'active' ? 'active-card' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                <div className="rentals-stat-icon-box box-mint">
                  <ArrowUpRight size={18} strokeWidth={2.4} />
                </div>
                <div className="rentals-stat-num">{activeLendCount}</div>
                <div className="rentals-stat-label">Lending</div>
              </div>

              {/* Stat 2: Active lendings */}
              <div
                className="rentals-stat-card card-blue"
                onClick={() => setStatusFilter('active')}
              >
                <div className="rentals-stat-icon-box box-blue">
                  <Clock size={18} strokeWidth={2.4} />
                </div>
                <div className="rentals-stat-num">{activeLendingsStrict}</div>
                <div className="rentals-stat-label">Active lendings</div>
              </div>

              {/* Stat 3: Due soon */}
              <div
                className="rentals-stat-card card-amber"
                onClick={() => setStatusFilter('active')}
              >
                <div className="rentals-stat-icon-box box-amber">
                  <Hourglass size={18} strokeWidth={2.4} />
                </div>
                <div className="rentals-stat-num">{dueSoonLendCount}</div>
                <div className="rentals-stat-label">Due soon</div>
              </div>

              {/* Stat 4: History */}
              <div
                className={`rentals-stat-card card-purple ${statusFilter === 'history' ? 'active-card' : ''}`}
                onClick={() => setStatusFilter('history')}
              >
                <div className="rentals-stat-icon-box box-purple">
                  <RotateCcw size={18} strokeWidth={2.4} />
                </div>
                <div className="rentals-stat-num">{historyLendCount}</div>
                <div className="rentals-stat-label">History</div>
              </div>
            </>
          )}
        </div>

        {/* ── View Toggle Pills & History Filter Tabs ───────────────────── */}
        <div className="rentals-controls-row">
          <div className="rentals-pills-group">
            {view === 'borrowing' ? (
              <>
                <button
                  type="button"
                  className="rentals-pill active"
                  onClick={() => setView('borrowing')}
                >
                  <Package size={14} />
                  <span>Borrowing</span>
                  <span className="rentals-pill-badge">{activeBorrowCount}</span>
                </button>

                <button
                  type="button"
                  className="rentals-pill"
                  onClick={() => setView('lending')}
                >
                  <ArrowUpRight size={14} />
                  <span>Lending</span>
                  <span className="rentals-pill-count">{activeLendCount}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rentals-pill"
                  onClick={() => setView('borrowing')}
                >
                  <ArrowLeft size={14} />
                  <span>Borrowing ({activeBorrowCount})</span>
                </button>

                <button
                  type="button"
                  className="rentals-pill active"
                  onClick={() => setView('lending')}
                >
                  <ArrowUpRight size={14} />
                  <span>Lending ({activeLendCount})</span>
                </button>
              </>
            )}
          </div>

          <div className="rentals-tabs-group">
            <button
              type="button"
              className={`rentals-tab ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`rentals-tab ${statusFilter === 'history' ? 'active' : ''}`}
              onClick={() => setStatusFilter('history')}
            >
              History
            </button>
          </div>
        </div>

        {/* ── Main Rentals List Container ────────────────────────────────── */}
        <div className="rentals-main-card">
          {loading ? (
            <div className="rd-loading" style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="rd-spinner" style={{ margin: '0 auto 12px' }} />
              <span style={{ color: '#64748b', fontSize: 14 }}>Loading rentals…</span>
            </div>
          ) : currentList.length === 0 ? (
            <div className="rentals-empty-container">
              <div className="rentals-icon-wrapper">
                <div className="rentals-circle-icon">
                  <Package size={34} strokeWidth={1.8} />
                </div>
                <svg
                  className="rentals-sparkle-svg"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                >
                  <path
                    d="M4 10L1 12M12 2L14 0M8 6L5 4"
                    stroke="#3b82f6"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="rentals-empty-title">
                {view === 'borrowing'
                  ? statusFilter === 'active'
                    ? 'No active borrowings'
                    : 'No borrowing history'
                  : statusFilter === 'active'
                  ? 'No active lendings'
                  : 'No lending history'}
              </h3>
              <p className="rentals-empty-desc">
                {view === 'borrowing'
                  ? 'Items you rent will appear here once a request is approved.'
                  : 'Items you lend to other students will appear here once requested.'}
              </p>
              <button
                type="button"
                className="rentals-primary-btn"
                onClick={() => navigate('/marketplace?type=rent')}
              >
                <Package size={16} /> Browse rentals
              </button>
            </div>
          ) : (
            <div className="rentals-list">
              {currentList.map((r) => {
                const itemTitle = r.listingId?.title || 'Rental Item';
                const counterpart =
                  view === 'borrowing'
                    ? r.ownerId?.profile?.name ||
                      r.ownerId?.email?.split('@')[0] ||
                      'Student'
                    : r.renterId?.profile?.name ||
                      r.renterId?.email?.split('@')[0] ||
                      'Student';

                const counterInitials = counterpart
                  ? counterpart
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'ST'
                  : 'ST';

                const imgUrl =
                  r.listingId?.images?.[0]?.thumbnailUrl ||
                  r.listingId?.images?.[0]?.url ||
                  r.listingId?.images?.[0] ||
                  null;

                const {
                  statusCfg,
                  timelineLabel,
                  timelineColorClass,
                  isOverdue,
                } = getStatusAndTimeline(r);

                const progressPct = getRentalProgress(r.startDate, r.dueDate);

                const dateRangeStr =
                  r.startDate && r.dueDate
                    ? `${fmtMonthDay(r.startDate)} - ${fmtMonthDay(r.dueDate)}`
                    : r.dueDate
                    ? `Due ${fmtMonthDay(r.dueDate)}`
                    : 'Flexible dates';

                if (view === 'lending') {
                  // ── Lending Card (Image 2) ───────────────────────────
                  return (
                    <div key={r._id} className="rental-card lending-card">
                      {/* Thumbnail */}
                      <div className="rental-thumb-box">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={itemTitle}
                            className="rental-thumb-img"
                          />
                        ) : (
                          <div className="rental-thumb-placeholder">
                            <Package size={26} color="#94a3b8" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="rental-info-col">
                        <h3 className="rental-item-title">{itemTitle}</h3>
                        <div className="rental-peer-row">
                          <span className="rental-peer-prefix">Lent to</span>
                          <span className="rental-peer-avatar">{counterInitials}</span>
                          <span className="rental-peer-name">{counterpart}</span>
                        </div>
                        <div className="rental-date-row">
                          <Calendar size={13} color="#94a3b8" />
                          <span>{dateRangeStr}</span>
                        </div>
                      </div>

                      {/* Right Status & Actions */}
                      <div className="rental-lending-status-col">
                        <span
                          className="rental-status-pill"
                          style={{
                            backgroundColor: statusCfg.bg,
                            color: statusCfg.color,
                            borderColor: statusCfg.border,
                          }}
                        >
                          <span
                            className="rental-status-dot"
                            style={{ backgroundColor: statusCfg.dot }}
                          />
                          {statusCfg.label}
                        </span>
                        {timelineLabel && (
                          <div
                            className={`rental-lending-days-left ${
                              isOverdue ? 'overdue' : ''
                            }`}
                          >
                            {timelineLabel}
                          </div>
                        )}
                      </div>

                      <div className="rental-lending-actions-col">
                        {r.status === 'requested' ? (
                          <>
                            <button
                              type="button"
                              className="rental-confirm-return-btn"
                              onClick={() =>
                                handleStatusUpdate(
                                  r._id,
                                  'approved',
                                  'Rental approved!'
                                )
                              }
                            >
                              <CheckCircle2 size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              className="req-cancel-btn"
                              onClick={() =>
                                handleStatusUpdate(
                                  r._id,
                                  'cancelled',
                                  'Rental rejected.'
                                )
                              }
                            >
                              <span>Reject</span>
                            </button>
                          </>
                        ) : r.status === 'approved' ? (
                          <button
                            type="button"
                            className="rental-confirm-return-btn"
                            onClick={() => navigate('/transactions')}
                          >
                            <KeyRound size={14} />
                            <span>Meetup PIN</span>
                          </button>
                        ) : r.status === 'active' || r.status === 'overdue' ? (
                          <button
                            type="button"
                            className="rental-confirm-return-btn"
                            onClick={() => handleConfirmReturn(r._id)}
                          >
                            <CheckCircle2 size={14} />
                            <span>Confirm Return</span>
                          </button>
                        ) : (
                          <span className="rental-completed-tag">
                            {r.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </span>
                        )}
                        <button
                          type="button"
                          className="rental-more-btn"
                          title="More options"
                        >
                          <MoreVertical size={16} color="#94a3b8" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── Borrowing Card (Image 1) ───────────────────────────
                return (
                  <div key={r._id} className="rental-card">
                    {/* Thumbnail */}
                    <div className="rental-thumb-box">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={itemTitle}
                          className="rental-thumb-img"
                        />
                      ) : (
                        <div className="rental-thumb-placeholder">
                          <Package size={26} color="#94a3b8" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="rental-info-col">
                      <h3 className="rental-item-title">{itemTitle}</h3>
                      <div className="rental-peer-row">
                        <span className="rental-peer-prefix">From</span>
                        <span className="rental-peer-avatar">{counterInitials}</span>
                        <span className="rental-peer-name">{counterpart}</span>
                      </div>
                      <div className="rental-pricing-row">
                        <span className="rental-price-rate">
                          ₹{r.price || r.rentalRate || 0} /day
                        </span>
                        <span className="rental-price-deposit">
                          + ₹{r.deposit || 0} deposit
                        </span>
                      </div>
                      <div className="rental-date-row">
                        <Calendar size={13} color="#94a3b8" />
                        <span>{dateRangeStr}</span>
                      </div>
                    </div>

                    {/* Timeline progress column */}
                    <div className="rental-timeline-col">
                      <div className="rental-timeline-meta">
                        <span
                          className={`rental-timeline-days ${
                            isOverdue ? 'overdue' : ''
                          }`}
                        >
                          {timelineLabel}
                        </span>
                      </div>
                      <div className="rental-progress-track">
                        <div
                          className={`rental-progress-fill ${timelineColorClass}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Right Status & Actions */}
                    <div className="rental-actions-col">
                      <div className="rental-status-row">
                        <span
                          className="rental-status-pill"
                          style={{
                            backgroundColor: statusCfg.bg,
                            color: statusCfg.color,
                            borderColor: statusCfg.border,
                          }}
                        >
                          <span
                            className="rental-status-dot"
                            style={{ backgroundColor: statusCfg.dot }}
                          />
                          {statusCfg.label}
                        </span>
                        <button
                          type="button"
                          className="rental-more-btn"
                          title="More options"
                        >
                          <MoreVertical size={16} color="#94a3b8" />
                        </button>
                      </div>

                      <div className="rental-buttons-row">
                        <button
                          type="button"
                          className="rental-chat-btn"
                          onClick={() => handleChatWithCounterpart(r)}
                        >
                          <MessageSquare size={13} />
                          <span>Chat</span>
                        </button>

                        {r.status === 'requested' ? (
                          <button
                            type="button"
                            className="req-cancel-btn"
                            onClick={() =>
                              handleStatusUpdate(
                                r._id,
                                'cancelled',
                                'Request cancelled.'
                              )
                            }
                          >
                            <span>Cancel</span>
                          </button>
                        ) : r.status === 'approved' ? (
                          <button
                            type="button"
                            className="rental-confirm-return-btn"
                            onClick={() => navigate('/transactions')}
                          >
                            <KeyRound size={13} />
                            <span>Enter PIN</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rental-return-btn"
                            onClick={() => handleConfirmReturn(r._id)}
                          >
                            <RotateCcw size={13} />
                            <span>Return</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showQRFor && (
          <QRModal
            rentalId={showQRFor}
            onClose={() => {
              setShowQRFor(null);
              loadData();
            }}
          />
        )}
        {scanQRFor && (
          <ScanQRModal
            rentalId={scanQRFor}
            onSuccess={(msg) => {
              showToast(msg);
              loadData();
            }}
            onClose={() => setScanQRFor(null)}
          />
        )}
      </div>
    </div>
  );
}

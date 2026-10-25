/**
 * Charmi Bhayani (202512028) — Rentals Tracker
 * RentalsPage.jsx
 *
 * Single page to track items you are borrowing and items you are lending out.
 * Matches reference: stat cards at top, borrowing/lending tabs, list with actions.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  History,
  QrCode,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  getMyRentals,
  updateRentalStatus,
  getRentalQR,
  verifyHandover,
  completeRental,
} from '../../rental/api/rentalApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const fmtShort = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : '—';

function getDaysLeft(dueDate) {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  return diff;
}

const STATUS_LABELS = {
  active: { label: 'Active', color: '#10b981', bg: '#d1fae5' },
  approved: { label: 'Approved', color: '#3b82f6', bg: '#dbeafe' },
  requested: { label: 'Requested', color: '#f59e0b', bg: '#fef3c7' },
  completed: { label: 'Completed', color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: '#fee2e2' },
  overdue: { label: 'Overdue', color: '#dc2626', bg: '#fee2e2' },
};

function StatusPill({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`rd-toast rd-toast-${type}`} onClick={onClose}>
      {type === 'success' ? '✓' : '✗'} {message}
    </div>
  );
}

// ─── QR Modal ────────────────────────────────────────────────────────────────
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
        <button className="rd-modal-close" onClick={onClose}><X size={16} /></button>
        <h3 className="rd-modal-title">QR Handover Code</h3>
        {loading && <div className="rd-spinner" />}
        {error && <p className="rd-error-msg">{error}</p>}
        {qrData && (
          <>
            <img src={qrData.qrDataUri} alt="QR Code" className="rd-qr-img" />
            <p className="rd-qr-hint">Show this QR to the renter to scan and verify in-person handover.</p>
            <code className="rd-qr-token">{qrData.token}</code>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Scan QR Modal ────────────────────────────────────────────────────────────
function ScanQRModal({ rentalId, onSuccess, onClose }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!token.trim()) { setError('Please enter the QR token.'); return; }
    setLoading(true); setError('');
    try {
      await verifyHandover(rentalId, token.trim());
      onSuccess('Handover verified! Rental is now active.');
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}><X size={16} /></button>
        <h3 className="rd-modal-title">Verify QR Handover</h3>
        <p className="rd-modal-sub">Enter the token displayed on the item owner's screen:</p>
        <input
          className="rd-input"
          placeholder="Paste or type QR token here..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          autoFocus
        />
        {error && <p className="rd-error-msg">{error}</p>}
        <button className="rd-btn rd-btn-primary" onClick={handleVerify} disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Verifying...' : 'Verify Handover'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Rentals Page ─────────────────────────────────────────────────────────
export default function RentalsPage() {
  const { user } = useAuth();
  const userId = user?._id;
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

  useEffect(() => { loadData(); }, [loadData]);

  const borrowingRentals = useMemo(
    () => allRentals.filter((r) => {
      const rId = r.renterId?._id || r.renterId;
      return rId && userId && rId.toString() === userId.toString();
    }),
    [allRentals, userId]
  );

  const lendingRentals = useMemo(
    () => allRentals.filter((r) => {
      const oId = r.ownerId?._id || r.ownerId;
      return oId && userId && oId.toString() === userId.toString();
    }),
    [allRentals, userId]
  );

  const currentList = useMemo(() => {
    const base = view === 'borrowing' ? borrowingRentals : lendingRentals;
    if (statusFilter === 'active') {
      return base.filter((r) => ['requested', 'approved', 'active', 'overdue'].includes(r.status));
    }
    return base.filter((r) => ['completed', 'cancelled'].includes(r.status));
  }, [view, statusFilter, borrowingRentals, lendingRentals]);

  const activeBorrowCount = borrowingRentals.filter((r) =>
    ['requested', 'approved', 'active', 'overdue'].includes(r.status)
  ).length;

  const activeLendCount = lendingRentals.filter((r) =>
    ['requested', 'approved', 'active', 'overdue'].includes(r.status)
  ).length;

  const dueSoonCount = allRentals.filter((r) => {
    const days = getDaysLeft(r.dueDate);
    return days !== null && days <= 3 && days >= 0 && r.status === 'active';
  }).length;

  const historyCount = allRentals.filter((r) =>
    ['completed', 'cancelled'].includes(r.status)
  ).length;

  const handleStatusUpdate = async (id, status, msg) => {
    try {
      await updateRentalStatus(id, status);
      showToast(msg);
      loadData();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleConfirmReturn = async (id) => {
    try {
      await completeRental(id);
      showToast('Return confirmed! Rental completed.');
      loadData();
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="rd-page">
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
      )}

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="rd-title">Rentals</h1>
          <p className="rd-subtitle">Track what you have borrowed and what you have lent.</p>
        </div>
        <button
          className="rd-btn rd-btn-secondary"
          onClick={() => navigate('/marketplace?type=rent')}
        >
          Browse rentals
        </button>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <div className="rentals-stat-row">
        <div
          className={`rentals-stat-card ${view === 'borrowing' && statusFilter === 'active' ? 'rentals-stat-active' : ''}`}
          onClick={() => { setView('borrowing'); setStatusFilter('active'); }}
        >
          <ArrowDownLeft size={18} style={{ marginBottom: 4 }} />
          <div className="rentals-stat-num">{activeBorrowCount}</div>
          <div className="rentals-stat-label">Borrowing</div>
        </div>
        <div
          className={`rentals-stat-card ${view === 'lending' && statusFilter === 'active' ? 'rentals-stat-active' : ''}`}
          onClick={() => { setView('lending'); setStatusFilter('active'); }}
        >
          <ArrowUpRight size={18} style={{ marginBottom: 4 }} />
          <div className="rentals-stat-num">{activeLendCount}</div>
          <div className="rentals-stat-label">Lending</div>
        </div>
        <div
          className={`rentals-stat-card ${dueSoonCount > 0 ? 'rentals-stat-due' : ''}`}
          style={{ cursor: 'default' }}
        >
          <Clock size={18} style={{ marginBottom: 4 }} />
          <div className="rentals-stat-num">{dueSoonCount}</div>
          <div className="rentals-stat-label">Due soon</div>
        </div>
        <div
          className="rentals-stat-card"
          onClick={() => setStatusFilter('history')}
        >
          <History size={18} style={{ marginBottom: 4 }} />
          <div className="rentals-stat-num">{historyCount}</div>
          <div className="rentals-stat-label">History</div>
        </div>
      </div>

      {/* ── View Toggle ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="hub-subview-toggle">
          <button
            className={`hub-subview-btn ${view === 'borrowing' ? 'active' : ''}`}
            onClick={() => setView('borrowing')}
          >
            <ArrowDownLeft size={14} />
            Borrowing ({borrowingRentals.length})
          </button>
          <button
            className={`hub-subview-btn ${view === 'lending' ? 'active' : ''}`}
            onClick={() => setView('lending')}
          >
            <ArrowUpRight size={14} />
            Lending ({lendingRentals.length})
          </button>
        </div>

        <div className="rd-tabs" style={{ margin: 0, borderBottom: 'none' }}>
          <button
            className={`rd-tab ${statusFilter === 'active' ? 'rd-tab-active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </button>
          <button
            className={`rd-tab ${statusFilter === 'history' ? 'rd-tab-active' : ''}`}
            onClick={() => setStatusFilter('history')}
          >
            History
          </button>
        </div>
      </div>

      {/* ── Rental List ───────────────────────────────────────────── */}
      <div className="rd-content">
        {loading ? (
          <div className="rd-loading">
            <div className="rd-spinner" />
            <span>Loading rentals…</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="rd-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Package size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
            <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>
              {view === 'borrowing'
                ? statusFilter === 'active' ? 'No active borrowings' : 'No borrowing history'
                : statusFilter === 'active' ? 'No items currently lent out' : 'No lending history'}
            </h4>
            {view === 'borrowing' ? (
              <button className="rd-btn rd-btn-primary" onClick={() => navigate('/marketplace?type=rent')}>
                Browse rentals
              </button>
            ) : (
              <button
                className="rd-btn rd-btn-primary"
                onClick={() => navigate('/marketplace/create', { state: { initialValues: { listingType: 'rent' } } })}
              >
                List an item for rent
              </button>
            )}
          </div>
        ) : (
          <div className="rentals-list">
            {currentList.map((r) => {
              const itemTitle = r.listingId?.title || 'Rental Item';
              const counterpart =
                view === 'borrowing'
                  ? r.ownerId?.profile?.name || r.ownerId?.email?.split('@')[0] || 'Student'
                  : r.renterId?.profile?.name || r.renterId?.email?.split('@')[0] || 'Student';
              const counterInitials = counterpart.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
              const daysLeft = getDaysLeft(r.dueDate);
              const isDueSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && r.status === 'active';

              return (
                <div key={r._id} className="rental-row">
                  {/* Item icon */}
                  <div className="rental-row-icon">
                    <Package size={18} style={{ color: '#64748b' }} />
                  </div>

                  {/* Item Info */}
                  <div className="rental-row-info">
                    <div className="rental-row-title">{itemTitle}</div>
                    <div className="rental-row-sub">
                      {view === 'borrowing' ? 'Borrowed' : 'Lent'} · ₹{r.rentalRate || 0}/{r.rentalPeriod || 'day'}
                    </div>
                  </div>

                  {/* Counterpart */}
                  <div className="rental-row-peer">
                    <div className="req-avatar" style={{ width: 28, height: 28, fontSize: 11, background: '#e0f2fe', color: '#0369a1' }}>
                      {counterInitials}
                    </div>
                    <span>{counterpart}</span>
                  </div>

                  {/* Due Date */}
                  <div className="rental-row-date">
                    <Clock size={13} style={{ color: isDueSoon ? '#f59e0b' : '#94a3b8' }} />
                    <span style={{ color: isDueSoon ? '#f59e0b' : 'inherit' }}>
                      {fmtShort(r.dueDate)}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    {isDueSoon ? (
                      <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <StatusPill status={r.status} />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="rental-row-actions">
                    {/* OWNER (Lending) */}
                    {view === 'lending' && r.status === 'requested' && (
                      <>
                        <button
                          className="rd-btn rd-btn-success rd-btn-sm"
                          onClick={() => handleStatusUpdate(r._id, 'approved', 'Rental approved!')}
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          className="rd-btn rd-btn-danger rd-btn-sm"
                          onClick={() => handleStatusUpdate(r._id, 'cancelled', 'Rental rejected.')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {view === 'lending' && r.status === 'approved' && (
                      <button
                        className="rd-btn rd-btn-primary rd-btn-sm"
                        onClick={() => setShowQRFor(r._id)}
                      >
                        <QrCode size={13} /> Handover QR
                      </button>
                    )}
                    {view === 'lending' && (r.status === 'active' || r.status === 'overdue') && (
                      <button
                        className="rd-btn rd-btn-success rd-btn-sm"
                        onClick={() => handleConfirmReturn(r._id)}
                      >
                        <CheckCircle2 size={13} /> Confirm Return
                      </button>
                    )}

                    {/* RENTER (Borrowing) */}
                    {view === 'borrowing' && r.status === 'requested' && (
                      <button
                        className="rd-btn rd-btn-danger rd-btn-sm"
                        onClick={() => handleStatusUpdate(r._id, 'cancelled', 'Request cancelled.')}
                      >
                        Cancel
                      </button>
                    )}
                    {view === 'borrowing' && r.status === 'approved' && (
                      <button
                        className="rd-btn rd-btn-primary rd-btn-sm"
                        onClick={() => setScanQRFor(r._id)}
                      >
                        <QrCode size={13} /> Verify QR
                      </button>
                    )}
                    {view === 'borrowing' && r.status === 'active' && (
                      <button
                        className="rd-btn rd-btn-secondary rd-btn-sm"
                        onClick={() => navigate('/chat')}
                      >
                        <MessageSquare size={13} /> Chat
                      </button>
                    )}

                    {(r.status === 'completed' || r.status === 'cancelled') && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {r.status === 'completed' ? 'Done' : 'Cancelled'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showQRFor && (
        <QRModal rentalId={showQRFor} onClose={() => { setShowQRFor(null); loadData(); }} />
      )}
      {scanQRFor && (
        <ScanQRModal
          rentalId={scanQRFor}
          onSuccess={(msg) => { showToast(msg); loadData(); }}
          onClose={() => setScanQRFor(null)}
        />
      )}
    </div>
  );
}

/**
 * Charmi Bhayani (202512028) - Rental & Transaction Management
 * RentalDashboardPage.jsx
 *
 * Fully live - all data fetched from backend via rentalApi.js.
 * No hardcoded mock data. Falls back to empty state with user-friendly message.
 *
 * Tabs:   Active Rentals | Requests | Rental History | Transactions
 * Modes:  Renter view  /  Owner view  (toggled via role switcher)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  getMyRentals,
  updateRentalStatus,
  getRentalQR,
  verifyHandover,
  completeRental,
  createRental,
  getMyTransactions,
  confirmTransaction,
  cancelTransaction,
} from '../api/rentalApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLES = {
  active:     'status-active',
  approved:   'status-approved',
  requested:  'status-requested',
  completed:  'status-completed',
  cancelled:  'status-cancelled',
  overdue:    'status-overdue',
  pending:    'status-requested',
  payment_held: 'status-approved',
  buyer_confirmed: 'status-approved',
  seller_confirmed: 'status-approved',
};

function StatusBadge({ status }) {
  return (
    <span className={`rd-badge ${STATUS_STYLES[status] || 'status-requested'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  if (!message) return null;
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
        <button className="rd-modal-close" onClick={onClose}>✕</button>
        <h3 className="rd-modal-title">QR Handover Code</h3>
        {loading && <div className="rd-spinner" />}
        {error && <p className="rd-error-msg">{error}</p>}
        {qrData && (
          <>
            <img src={qrData.qrDataUri} alt="QR Code" className="rd-qr-img" />
            <p className="rd-qr-hint">Show this QR to the renter to scan and verify handover.</p>
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}>✕</button>
        <h3 className="rd-modal-title">Verify QR Handover</h3>
        <p className="rd-modal-sub">Enter the token displayed on the owner's QR code screen:</p>
        <input
          className="rd-input"
          placeholder="Paste QR token here..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
        {error && <p className="rd-error-msg">{error}</p>}
        <button className="rd-btn rd-btn-primary" onClick={handleVerify} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Handover'}
        </button>
      </div>
    </div>
  );
}

// ─── Request Rental Modal ─────────────────────────────────────────────────────
function RequestRentalModal({ onSuccess, onClose }) {
  const [form, setForm] = useState({ listingId: '', startDate: '', dueDate: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.listingId || !form.startDate || !form.dueDate) {
      setError('Listing ID, start date and due date are required.');
      return;
    }
    setLoading(true); setError('');
    try {
      await createRental(form);
      onSuccess('Rental request submitted successfully!');
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
        <button className="rd-modal-close" onClick={onClose}>✕</button>
        <h3 className="rd-modal-title">Request a Rental</h3>
        <label className="rd-label">Listing ID</label>
        <input className="rd-input" placeholder="Paste the listing ID..."
          value={form.listingId} onChange={(e) => setForm({ ...form, listingId: e.target.value })} />
        <label className="rd-label">Start Date</label>
        <input className="rd-input" type="date"
          value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <label className="rd-label">Due Date</label>
        <input className="rd-input" type="date"
          value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <label className="rd-label">Message (optional)</label>
        <textarea className="rd-input rd-textarea" placeholder="Message to owner..."
          value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        {error && <p className="rd-error-msg">{error}</p>}
        <button className="rd-btn rd-btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}

// ─── Rentals Table ────────────────────────────────────────────────────────────
function RentalsTable({ rentals, role, userId, onAction, onShowQR, onScanQR, onConfirmReturn }) {
  if (!rentals.length) {
    return <div className="rd-empty">No rentals found.</div>;
  }

  return (
    <div className="rd-table-wrap">
      <table className="rd-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>{role === 'owner' ? 'Renter' : 'Owner'}</th>
            <th>Start</th>
            <th>Due</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => {
            const itemTitle = r.listingId?.title || r.listingId || 'Item';
            const counterpart =
              role === 'owner'
                ? r.renterId?.profile?.name || r.renterId?.email || '—'
                : r.ownerId?.profile?.name || r.ownerId?.email || '—';
            const isOwner = r.ownerId?._id === userId || r.ownerId?.toString?.() === userId;

            return (
              <tr key={r._id}>
                <td className="rd-td-item">{itemTitle}</td>
                <td>{counterpart}</td>
                <td>{fmt(r.startDate)}</td>
                <td className={r.status === 'overdue' ? 'rd-overdue-text' : ''}>{fmt(r.dueDate)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="rd-actions">
                  {/* Owner: approve / reject requests */}
                  {role === 'owner' && r.status === 'requested' && (
                    <>
                      <button className="rd-btn rd-btn-success rd-btn-sm"
                        onClick={() => onAction(r._id, 'approved', 'Rental approved!')}>Approve</button>
                      <button className="rd-btn rd-btn-danger rd-btn-sm"
                        onClick={() => onAction(r._id, 'cancelled', 'Rental rejected.')}>Reject</button>
                    </>
                  )}
                  {/* Owner: show QR for approved rentals */}
                  {role === 'owner' && r.status === 'approved' && (
                    <button className="rd-btn rd-btn-primary rd-btn-sm" onClick={() => onShowQR(r._id)}>
                      Show QR
                    </button>
                  )}
                  {/* Renter: cancel own requests */}
                  {role === 'renter' && r.status === 'requested' && (
                    <button className="rd-btn rd-btn-danger rd-btn-sm"
                      onClick={() => onAction(r._id, 'cancelled', 'Request cancelled.')}>Cancel</button>
                  )}
                  {/* Renter: scan/verify QR */}
                  {role === 'renter' && r.status === 'approved' && (
                    <button className="rd-btn rd-btn-primary rd-btn-sm" onClick={() => onScanQR(r._id)}>
                      Scan / Verify QR
                    </button>
                  )}
                  {/* Owner: confirm return */}
                  {role === 'owner' && (r.status === 'active' || r.status === 'overdue') && (
                    <button className="rd-btn rd-btn-success rd-btn-sm" onClick={() => onConfirmReturn(r._id)}>
                      Confirm Return
                    </button>
                  )}
                  {(r.status === 'completed' || r.status === 'cancelled') && (
                    <span className="rd-done-label">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Transactions Table ───────────────────────────────────────────────────────
function TransactionsTable({ transactions, userId, onConfirm, onCancel }) {
  if (!transactions.length) {
    return <div className="rd-empty">No transactions found.</div>;
  }

  return (
    <div className="rd-table-wrap">
      <table className="rd-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Other Party</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const isBuyer = t.buyerId?._id === userId || t.buyerId?.toString?.() === userId;
            const counterpart = isBuyer
              ? t.sellerId?.profile?.name || t.sellerId?.email || '—'
              : t.buyerId?.profile?.name || t.buyerId?.email || '—';
            const myRole = isBuyer ? 'Buyer' : 'Seller';
            const alreadyConfirmed =
              (isBuyer && t.buyerConfirmedAt) || (!isBuyer && t.sellerConfirmedAt);
            const canConfirm = !alreadyConfirmed &&
              ['pending', 'payment_held', 'buyer_confirmed', 'seller_confirmed'].includes(t.status);
            const canCancel = ['pending', 'payment_held'].includes(t.status);

            return (
              <tr key={t._id}>
                <td className="rd-td-item">{t.listingId?.title || '—'}</td>
                <td>
                  <span className={`rd-type-pill rd-type-${t.type}`}>{t.type}</span>
                  <span className="rd-my-role">({myRole})</span>
                </td>
                <td>₹{t.amount ?? '—'}</td>
                <td>{counterpart}</td>
                <td><StatusBadge status={t.status} /></td>
                <td className="rd-actions">
                  {canConfirm && (
                    <button className="rd-btn rd-btn-success rd-btn-sm" onClick={() => onConfirm(t._id)}>
                      Confirm Receipt
                    </button>
                  )}
                  {canCancel && (
                    <button className="rd-btn rd-btn-danger rd-btn-sm" onClick={() => onCancel(t._id)}>
                      Cancel
                    </button>
                  )}
                  {t.status === 'completed' && <span className="rd-done-label">Done ✓</span>}
                  {t.status === 'cancelled' && <span className="rd-done-label">Cancelled</span>}
                  {alreadyConfirmed && canConfirm === false && t.status !== 'completed' && t.status !== 'cancelled' && (
                    <span className="rd-done-label">Awaiting other party</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────
function StatCards({ rentals, transactions }) {
  const active    = rentals.filter((r) => r.status === 'active').length;
  const pending   = rentals.filter((r) => r.status === 'requested').length;
  const completed = rentals.filter((r) => r.status === 'completed').length;
  const txnTotal  = transactions.length;

  return (
    <div className="rd-stat-grid">
      {[
        { label: 'Active Rentals', value: active, icon: '📦' },
        { label: 'Pending Requests', value: pending, icon: '⏳' },
        { label: 'Completed Rentals', value: completed, icon: '✅' },
        { label: 'Transactions', value: txnTotal, icon: '💳' },
      ].map((s) => (
        <div key={s.label} className="rd-stat-card">
          <div className="rd-stat-icon">{s.icon}</div>
          <div className="rd-stat-value">{s.value}</div>
          <div className="rd-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = ['Active Rentals', 'Requests', 'Rental History', 'Transactions'];

export default function RentalDashboardPage() {
  const { user } = useAuth();
  const userId = user?._id;

  const [role, setRole] = useState('renter'); // 'renter' | 'owner'
  const [activeTab, setActiveTab] = useState('Active Rentals');
  const [rentals, setRentals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modals
  const [showQRFor, setShowQRFor] = useState(null);
  const [scanQRFor, setScanQRFor] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rentalRes, txnRes] = await Promise.all([
        getMyRentals({ role }),
        getMyTransactions({}),
      ]);
      setRentals(rentalRes.rentals || []);
      setTransactions(txnRes.transactions || []);
    } catch (e) {
      showToast(e.message || 'Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filter rentals per tab
  const filteredRentals = (() => {
    if (activeTab === 'Active Rentals') return rentals.filter((r) => ['active', 'overdue'].includes(r.status));
    if (activeTab === 'Requests')       return rentals.filter((r) => ['requested', 'approved'].includes(r.status));
    if (activeTab === 'Rental History') return rentals.filter((r) => ['completed', 'cancelled'].includes(r.status));
    return [];
  })();

  // ── Actions
  const handleStatusUpdate = async (id, status, successMsg) => {
    try {
      await updateRentalStatus(id, status);
      showToast(successMsg);
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

  const handleConfirmTxn = async (id) => {
    try {
      await confirmTransaction(id);
      showToast('Receipt confirmed!');
      loadData();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleCancelTxn = async (id) => {
    try {
      await cancelTransaction(id);
      showToast('Transaction cancelled.');
      loadData();
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="rd-page">
      {/* Toast */}
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
      )}

      {/* Header */}
      <div className="rd-header">
        <div>
          <h1 className="rd-title">Rental Dashboard</h1>
          <p className="rd-subtitle">Manage your active rentals, requests, history, and transactions.</p>
        </div>
        <div className="rd-header-actions">
          <button
            className={`rd-role-toggle ${role === 'renter' ? 'rd-role-renter' : 'rd-role-owner'}`}
            onClick={() => setRole((r) => (r === 'renter' ? 'owner' : 'renter'))}
          >
            {role === 'renter' ? '🎒 Renter View' : '🏠 Owner View'}
            <span className="rd-role-switch-hint"> — click to switch</span>
          </button>
          {role === 'renter' && (
            <button className="rd-btn rd-btn-primary" onClick={() => setShowRequestModal(true)}>
              + Request Rental
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <StatCards rentals={rentals} transactions={transactions} />

      {/* Tabs */}
      <div className="rd-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`rd-tab ${activeTab === tab ? 'rd-tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Active Rentals' && rentals.filter(r => ['active','overdue'].includes(r.status)).length > 0 && (
              <span className="rd-tab-badge">{rentals.filter(r => ['active','overdue'].includes(r.status)).length}</span>
            )}
            {tab === 'Requests' && rentals.filter(r => r.status === 'requested').length > 0 && (
              <span className="rd-tab-badge rd-tab-badge-warn">{rentals.filter(r => r.status === 'requested').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rd-content">
        {loading ? (
          <div className="rd-loading">
            <div className="rd-spinner" />
            <span>Loading your data…</span>
          </div>
        ) : activeTab === 'Transactions' ? (
          <TransactionsTable
            transactions={transactions}
            userId={userId}
            onConfirm={handleConfirmTxn}
            onCancel={handleCancelTxn}
          />
        ) : (
          <RentalsTable
            rentals={filteredRentals}
            role={role}
            userId={userId}
            onAction={handleStatusUpdate}
            onShowQR={setShowQRFor}
            onScanQR={setScanQRFor}
            onConfirmReturn={handleConfirmReturn}
          />
        )}
      </div>

      {/* Modals */}
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
      {showRequestModal && (
        <RequestRentalModal
          onSuccess={(msg) => { showToast(msg); loadData(); }}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  );
}

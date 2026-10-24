/**
 * Charmi Bhayani (202512028) - Rental & Transaction Management
 * RentalDashboardPage.jsx
 *
 * Fully live - all data fetched from backend via rentalApi.js.
 * No hardcoded mock data. Falls back to empty state with user-friendly message.
 *
 * Tabs:
 *   - Active Rentals: Ongoing, pending approval, and overdue rentals
 *   - Item Requests: Free-form requests for unlisted items (e.g. calculator for 2 days)
 *   - Rental History: Completed and cancelled rentals
 *   - Transactions: Escrow transaction statuses
 *
 * Modes:  Renter view  /  Owner view  (toggled via role switcher)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  getMyRentals,
  updateRentalStatus,
  getRentalQR,
  verifyHandover,
  completeRental,
  getMyTransactions,
  confirmTransaction,
  cancelTransaction,
  createRentalRequest,
  getMyRentalRequests,
  getAllRentalRequests,
  cancelRentalRequest,
  notifyItemListing,
} from '../api/rentalApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLES = {
  active:           'status-active',
  approved:         'status-approved',
  requested:        'status-requested',
  completed:        'status-completed',
  cancelled:        'status-cancelled',
  overdue:          'status-overdue',
  open:             'status-active',
  fulfilled:        'status-completed',
  pending:          'status-requested',
  payment_held:     'status-approved',
  buyer_confirmed:  'status-approved',
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

// ─── Request Item Modal (Free-form, no listing ID needed) ─────────────────────
function RequestItemModal({ onSuccess, onClose }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    itemName: '',
    category: 'Electronics',
    startDate: todayStr,
    dueDate: '',
    budgetPerDay: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.itemName.trim()) {
      setError('Please provide the name of the item you need.');
      return;
    }
    if (!form.startDate || !form.dueDate) {
      setError('Both start date and return date are required.');
      return;
    }
    if (new Date(form.startDate) >= new Date(form.dueDate)) {
      setError('Start date must be before return date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createRentalRequest({
        itemName: form.itemName.trim(),
        category: form.category,
        startDate: form.startDate,
        dueDate: form.dueDate,
        budgetPerDay: form.budgetPerDay ? Number(form.budgetPerDay) : null,
        description: form.description.trim(),
      });
      onSuccess('Rental request posted! Campus owners can now see what you need.');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit rental request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}>✕</button>
        <h3 className="rd-modal-title">Request an Item on Rent</h3>
        <p className="rd-modal-sub">
          Can't find what you need in the marketplace? Post your requirement so students with the item can connect with you.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="rd-label">Item Name *</label>
          <input
            className="rd-input"
            placeholder="e.g. Scientific Calculator (Casio fx-991EX), Lab Coat, Drafter..."
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            autoFocus
          />

          <div className="rd-grid-2">
            <div>
              <label className="rd-label">Category</label>
              <select
                className="rd-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="Electronics">Electronics & Gadgets</option>
                <option value="Books">Books & Study Material</option>
                <option value="Lab Equipment">Lab Equipment</option>
                <option value="Stationery">Stationery</option>
                <option value="Sports">Sports & Fitness</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="rd-label">Daily Budget (₹, optional)</label>
              <input
                className="rd-input"
                type="number"
                min="0"
                placeholder="e.g. 20 (or blank for flexible)"
                value={form.budgetPerDay}
                onChange={(e) => setForm({ ...form, budgetPerDay: e.target.value })}
              />
            </div>
          </div>

          <div className="rd-grid-2">
            <div>
              <label className="rd-label">Needed From *</label>
              <input
                className="rd-input"
                type="date"
                min={todayStr}
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="rd-label">Needed Until *</label>
              <input
                className="rd-input"
                type="date"
                min={form.startDate || todayStr}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <label className="rd-label">Details / Urgency (optional)</label>
          <textarea
            className="rd-input rd-textarea"
            placeholder="e.g. Needed for 2 days for end-sem exam, prefer working condition..."
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {error && <p className="rd-error-msg">{error}</p>}

          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="rd-btn"
              style={{ background: 'transparent', color: '#9ca3af' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="rd-btn rd-btn-primary" disabled={loading}>
              {loading ? 'Posting...' : 'Post Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Item Requests Table (Unlisted Items Needed) ─────────────────────────────
function ItemRequestsTable({ itemRequests, role, userId, onCancel, onRequestNew, onInterestedList, actionLoading }) {
  if (!itemRequests.length) {
    return (
      <div className="rd-empty" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
        <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>
          {role === 'renter' ? 'No item requests yet' : 'No open requests from students'}
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 420, margin: '0 auto 16px' }}>
          {role === 'renter'
            ? "Looking for an item like a calculator, lab kit, or book that isn't listed on the marketplace? Post a request so owners can help!"
            : "No students currently have open requests for items. Check back later!"}
        </p>
        {role === 'renter' && (
          <button className="rd-btn rd-btn-primary" onClick={onRequestNew}>
            + Request an Item
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rd-table-wrap">
      <table className="rd-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>{role === 'owner' ? 'Requested By' : 'Category'}</th>
            <th>Required Duration</th>
            <th>Budget</th>
            <th>Details</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {itemRequests.map((req) => {
            const isMyRequest = req.requesterId?._id === userId || req.requesterId === userId;
            const requesterName = req.requesterId?.profile?.name || req.requesterId?.email || 'Student';
            const daysCount = Math.max(
              1,
              Math.ceil((new Date(req.dueDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24))
            );

            return (
              <tr key={req._id}>
                <td className="rd-td-item">
                  <div>{req.itemName}</div>
                  <span className="rd-tag">{req.category || 'Other'}</span>
                </td>
                <td>{role === 'owner' ? requesterName : req.category || '—'}</td>
                <td>
                  <div>{fmt(req.startDate)} → {fmt(req.dueDate)}</div>
                  <small style={{ color: 'var(--text-muted)' }}>({daysCount} day{daysCount > 1 ? 's' : ''})</small>
                </td>
                <td>
                  {req.budgetPerDay ? `₹${req.budgetPerDay}/day` : <span style={{ color: 'var(--text-muted)' }}>Flexible</span>}
                </td>
                <td style={{ maxWidth: 220, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {req.description || '—'}
                </td>
                <td><StatusBadge status={req.status} /></td>
                <td className="rd-actions">
                  {isMyRequest && req.status === 'open' && (
                    <button
                      className="rd-btn rd-btn-danger rd-btn-sm"
                      onClick={() => onCancel(req._id)}
                    >
                      Cancel Request
                    </button>
                  )}
                  {role === 'owner' && req.status === 'open' && (
                    <button
                      className="rd-btn rd-btn-primary rd-btn-sm"
                      onClick={() => onInterestedList(req)}
                      disabled={actionLoading === req._id}
                      title="Notify student and open listing form"
                    >
                      {actionLoading === req._id ? 'Notifying...' : 'Interested? List Item'}
                    </button>
                  )}
                  {(!isMyRequest && role !== 'owner') && (
                    <span className="rd-done-label">{req.status === 'open' ? 'Open' : '—'}</span>
                  )}
                  {req.status !== 'open' && (
                    <span className="rd-done-label">{req.status}</span>
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

// ─── Rentals Table (Listing-based Rentals) ────────────────────────────────────
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
function StatCards({ rentals, transactions, itemRequests }) {
  const active    = rentals.filter((r) => ['requested', 'approved', 'active', 'overdue'].includes(r.status)).length;
  const requests  = itemRequests.filter((r) => r.status === 'open').length;
  const completed = rentals.filter((r) => r.status === 'completed').length;
  const txnTotal  = transactions.length;

  return (
    <div className="rd-stat-grid">
      {[
        { label: 'Active Rentals', value: active, icon: '📦' },
        { label: 'Item Requests', value: requests, icon: '📋' },
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
const TABS = ['Active Rentals', 'Item Requests', 'Rental History', 'Transactions'];

export default function RentalDashboardPage() {
  const { user } = useAuth();
  const userId = user?._id;

  const navigate = useNavigate();
  const [role, setRole] = useState('renter'); // 'renter' | 'owner'
  const [activeTab, setActiveTab] = useState('Active Rentals');
  const [rentals, setRentals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [itemRequests, setItemRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modals
  const [showQRFor, setShowQRFor] = useState(null);
  const [scanQRFor, setScanQRFor] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rentalRes, txnRes, reqRes] = await Promise.all([
        getMyRentals({ role }),
        getMyTransactions({}),
        role === 'renter' ? getMyRentalRequests() : getAllRentalRequests(),
      ]);
      setRentals(rentalRes.rentals || []);
      setTransactions(txnRes.transactions || []);
      setItemRequests(reqRes.requests || []);
    } catch (e) {
      showToast(e.message || 'Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filter rentals per tab
  const filteredRentals = (() => {
    if (activeTab === 'Active Rentals') return rentals.filter((r) => ['requested', 'approved', 'active', 'overdue'].includes(r.status));
    if (activeTab === 'Rental History') return rentals.filter((r) => ['completed', 'cancelled'].includes(r.status));
    return [];
  })();

  // ── In Owner view, exclude own requests from community requests
  const visibleItemRequests = role === 'owner'
    ? itemRequests.filter((r) => {
        const reqUserId = r.requesterId?._id?.toString?.() || r.requesterId?.toString?.();
        return reqUserId && userId && reqUserId !== userId.toString();
      })
    : itemRequests;

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

  const handleCancelItemRequest = async (id) => {
    try {
      await cancelRentalRequest(id);
      showToast('Rental request cancelled.');
      loadData();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleInterestedList = async (req) => {
    try {
      setActionLoading(req._id);
      await notifyItemListing(req._id);
      showToast(`Student notified! Redirecting to list "${req.itemName}"...`);
      setTimeout(() => {
        navigate('/marketplace/create', {
          state: {
            fromRentalRequest: true,
            requestId: req._id,
            initialValues: {
              title: req.itemName,
              categoryName: req.category,
              listingType: 'rent',
              rentalRate: req.budgetPerDay || '',
              rentalPeriod: 'day',
              description: `Available for rent in response to student request for ${req.itemName}.${req.description ? ` (Requested details: ${req.description})` : ''}`,
            },
          },
        });
      }, 500);
    } catch (e) {
      showToast(e.message || 'Failed to notify student.', 'error');
      setActionLoading(null);
    }
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
          <p className="rd-subtitle">Manage your active rentals, item requests, rental history, and transactions.</p>
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
              + Request an Item
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <StatCards rentals={rentals} transactions={transactions} itemRequests={visibleItemRequests} />

      {/* Tabs */}
      <div className="rd-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`rd-tab ${activeTab === tab ? 'rd-tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Active Rentals' && rentals.filter(r => ['requested', 'approved', 'active', 'overdue'].includes(r.status)).length > 0 && (
              <span className="rd-tab-badge">{rentals.filter(r => ['requested', 'approved', 'active', 'overdue'].includes(r.status)).length}</span>
            )}
            {tab === 'Item Requests' && visibleItemRequests.filter(r => r.status === 'open').length > 0 && (
              <span className="rd-tab-badge rd-tab-badge-warn">{visibleItemRequests.filter(r => r.status === 'open').length}</span>
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
        ) : activeTab === 'Item Requests' ? (
          <ItemRequestsTable
            itemRequests={visibleItemRequests}
            role={role}
            userId={userId}
            onCancel={handleCancelItemRequest}
            onRequestNew={() => setShowRequestModal(true)}
            onInterestedList={handleInterestedList}
            actionLoading={actionLoading}
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
        <RequestItemModal
          onSuccess={(msg) => { showToast(msg); loadData(); }}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  );
}

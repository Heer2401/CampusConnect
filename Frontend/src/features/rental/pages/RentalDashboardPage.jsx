/**
 * Charmi Bhayani (202512028) - Rental & Transaction Management
 * RentalDashboardPage.jsx
 *
 * Refactored into 3 clear, dedicated pillars to eliminate confusion:
 *   1. Renting Hub: Active borrowings, lent items, due dates, QR handovers
 *   2. Wanted Requests: Campus request board, student needs, fulfill/list requests
 *   3. Dashboard & Escrow: In-person Meetup PINs, escrow transactions, overview metrics
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Package,
  ClipboardList,
  LayoutDashboard,
  Search,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  KeyRound,
  QrCode,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Handshake,
  Lock,
  Megaphone,
  CreditCard,
  Home,
  AlertTriangle,
} from 'lucide-react';
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
  generateTransactionPin,
  verifyTransactionPin,
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
    <div className={`rd-toast rd-toast-${type}`} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {type === 'success' ? <Check size={14} /> : <X size={14} />} {message}
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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

// ─── Show Handover PIN Modal (Seller) ─────────────────────────────────────────
function ShowPinModal({ transaction, onSuccess, onClose }) {
  const [pin, setPin] = useState(transaction?.handoverPin || '');
  const [loading, setLoading] = useState(!transaction?.handoverPin);
  const [error, setError] = useState('');

  const fetchOrGeneratePin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await generateTransactionPin(transaction._id);
      setPin(res.pin);
      if (onSuccess) onSuccess('Meetup PIN generated!');
    } catch (err) {
      setError(err.message || 'Failed to generate PIN');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!transaction?.handoverPin) {
      fetchOrGeneratePin();
    }
  }, [transaction?._id]);

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" style={{ maxWidth: 440, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}><X size={16} /></button>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <Handshake size={36} color="#6366f1" />
        </div>
        <h3 className="rd-modal-title">In-Person Handover PIN</h3>
        <p className="rd-modal-sub" style={{ marginBottom: '14px' }}>
          Item: <strong>{transaction?.listingId?.title || 'Listing'}</strong><br />
          Show this 6-digit code to the buyer during your meetup:
        </p>

        {loading ? (
          <div className="rd-spinner" style={{ margin: '20px auto' }} />
        ) : error ? (
          <div className="rd-error-msg">{error}</div>
        ) : (
          <div className="rd-pin-display-box">
            <div className="rd-pin-digits">{pin}</div>
            <p className="rd-pin-instruction">Buyer will enter this on their device to confirm item receipt and complete the transaction.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
          <button className="rd-btn rd-btn-secondary" onClick={fetchOrGeneratePin} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Regenerate PIN
          </button>
          <button className="rd-btn rd-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Verify Handover PIN Modal (Buyer) ────────────────────────────────────────
function VerifyPinModal({ transaction, onSuccess, onClose }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!pin.trim() || pin.trim().length !== 6) {
      setError('Please enter the 6-digit PIN.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyTransactionPin(transaction._id, pin.trim());
      onSuccess('Handover verified! Transaction completed successfully.');
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid PIN. Please check the seller screen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" style={{ maxWidth: 440, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}><X size={16} /></button>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <Lock size={36} color="#6366f1" />
        </div>
        <h3 className="rd-modal-title">Verify Meetup Handover</h3>
        <p className="rd-modal-sub" style={{ marginBottom: '14px' }}>
          Item: <strong>{transaction?.listingId?.title || 'Listing'}</strong><br />
          Enter the 6-digit PIN shown on the seller screen after inspecting the item:
        </p>

        <form onSubmit={handleVerify}>
          <input
            className="rd-pin-input"
            maxLength={6}
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />

          {error && <p className="rd-error-msg" style={{ marginTop: '8px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            <button type="button" className="rd-btn rd-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="rd-btn rd-btn-verify" disabled={loading || pin.trim().length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Request Item Modal (Post to Campus Wanted Board) ─────────────────────────
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
      onSuccess('Request posted to Campus Wanted Board! Students who own this item will be notified.');
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
        <button className="rd-modal-close" onClick={onClose}><X size={16} /></button>
        <h3 className="rd-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={18} color="#6366f1" /> Post an Item Request
        </h3>
        <p className="rd-modal-sub">
          Can't find what you need on CampusConnect? Post your requirement so students with the item can lend or list it for you.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="rd-label">Item Needed *</label>
          <input
            className="rd-input"
            placeholder="e.g. Scientific Calculator (fx-991EX), Lab Coat, Drafter, Novel..."
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
                placeholder="e.g. 25 (or leave empty)"
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

          <label className="rd-label">Notes / Urgency (optional)</label>
          <textarea
            className="rd-input rd-textarea"
            placeholder="e.g. Needed for 2 days for end-sem exam; please reach out if available in Hostel Block C..."
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

// ─── Main Hub Page Component ──────────────────────────────────────────────────
export default function RentalDashboardPage() {
  const { user } = useAuth();
  const userId = user?._id;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Pillar State: 'dashboard' | 'requesting' | 'renting'
  const initialPillar = useMemo(() => {
    const qView = searchParams.get('view');
    if (['dashboard', 'requesting', 'renting'].includes(qView)) return qView;
    if (location.state?.tab === 'Active Rentals' || location.state?.tab === 'Rental History') return 'renting';
    if (location.state?.tab === 'Item Requests') return 'requesting';
    return 'dashboard'; // Main page defaults to Escrow Dashboard
  }, [searchParams, location.state]);

  const [activePillar, setActivePillar] = useState(initialPillar);

  // ── Sub-view states for each pillar
  const [rentalSubView, setRentalSubView] = useState('borrowing'); // 'borrowing' | 'lending'
  const [rentalStatusFilter, setRentalStatusFilter] = useState('active'); // 'active' | 'history'
  const [requestSubView, setRequestSubView] = useState('my_requests'); // 'my_requests' | 'campus_feed'
  const [txnFilter, setTxnFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'cancelled'

  // ── Data storage
  const [allRentals, setAllRentals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [communityRequests, setCommunityRequests] = useState([]);

  // ── UI feedback & loading
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // ── Modals
  const [showQRFor, setShowQRFor] = useState(null);
  const [scanQRFor, setScanQRFor] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPinFor, setShowPinFor] = useState(null);
  const [verifyPinFor, setVerifyPinFor] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // Sync state message & tab from routing
  useEffect(() => {
    if (location.state?.tab === 'Transactions') {
      setActivePillar('dashboard');
    } else if (location.state?.tab === 'Item Requests') {
      setActivePillar('requesting');
    } else if (location.state?.tab === 'Active Rentals') {
      setActivePillar('renting');
      setRentalStatusFilter('active');
    }
    if (location.state?.message) {
      showToast(location.state.message);
    }
  }, [location.state]);

  // Load all 4 datasets together
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rentalRes, txnRes, myReqRes, allReqRes] = await Promise.all([
        getMyRentals(), // fetches both renter and owner rentals
        getMyTransactions({}),
        getMyRentalRequests(),
        getAllRentalRequests(),
      ]);
      setAllRentals(rentalRes.rentals || []);
      setTransactions(txnRes.transactions || []);
      setMyRequests(myReqRes.requests || []);
      setCommunityRequests(allReqRes.requests || []);
    } catch (e) {
      showToast(e.message || 'Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Switch pillar handler with URL parameter sync
  const handlePillarChange = (pillar) => {
    setActivePillar(pillar);
    setSearchParams({ view: pillar });
  };

  // ── Derived Rentals
  const borrowingRentals = useMemo(() => {
    return allRentals.filter((r) => {
      const rId = r.renterId?._id || r.renterId;
      return rId && userId && rId.toString() === userId.toString();
    });
  }, [allRentals, userId]);

  const lendingRentals = useMemo(() => {
    return allRentals.filter((r) => {
      const oId = r.ownerId?._id || r.ownerId;
      return oId && userId && oId.toString() === userId.toString();
    });
  }, [allRentals, userId]);

  const currentRentalsList = useMemo(() => {
    const base = rentalSubView === 'borrowing' ? borrowingRentals : lendingRentals;
    if (rentalStatusFilter === 'active') {
      return base.filter((r) => ['requested', 'approved', 'active', 'overdue'].includes(r.status));
    }
    return base.filter((r) => ['completed', 'cancelled'].includes(r.status));
  }, [rentalSubView, rentalStatusFilter, borrowingRentals, lendingRentals]);

  // ── Derived Transactions
  const filteredTransactions = useMemo(() => {
    if (txnFilter === 'pending') {
      return transactions.filter((t) =>
        ['pending', 'payment_held', 'buyer_confirmed', 'seller_confirmed'].includes(t.status)
      );
    }
    if (txnFilter === 'completed') {
      return transactions.filter((t) => t.status === 'completed');
    }
    if (txnFilter === 'cancelled') {
      return transactions.filter((t) => t.status === 'cancelled');
    }
    return transactions;
  }, [transactions, txnFilter]);

  // ── Action Handlers
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

  // Metrics for Top Pillar Nav
  const activeRentalsCount = allRentals.filter((r) =>
    ['requested', 'approved', 'active', 'overdue'].includes(r.status)
  ).length;

  const openRequestsCount = myRequests.filter((r) => r.status === 'open').length;
  const pendingTxnCount = transactions.filter((t) =>
    ['pending', 'payment_held', 'buyer_confirmed', 'seller_confirmed'].includes(t.status)
  ).length;

  return (
    <div className="rd-page">
      {/* Toast Alert */}
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
      )}

      {/* ─── 3 PRIMARY PILLARS NAVIGATOR ──────────────────────────────────── */}
      <div className="hub-pillar-nav">
        {/* Pillar 1: Escrow Dashboard */}
        <div
          className={`hub-pillar-card ${activePillar === 'dashboard' ? 'active' : ''}`}
          onClick={() => handlePillarChange('dashboard')}
        >
          <div className="hub-pillar-left">
            <div className="hub-pillar-icon">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <div className="hub-pillar-title">1. Escrow Dashboard</div>
              <div className="hub-pillar-desc">In-person PINs & transactions</div>
            </div>
          </div>
          <span className="hub-pillar-badge">
            {pendingTxnCount > 0 ? `${pendingTxnCount} Handovers` : `${transactions.length} Total`}
          </span>
        </div>

        {/* Pillar 2: Campus Request Board */}
        <div
          className={`hub-pillar-card ${activePillar === 'requesting' ? 'active' : ''}`}
          onClick={() => handlePillarChange('requesting')}
        >
          <div className="hub-pillar-left">
            <div className="hub-pillar-icon">
              <ClipboardList size={22} />
            </div>
            <div>
              <div className="hub-pillar-title">2. Campus Request Board</div>
              <div className="hub-pillar-desc">Wanted posts for unlisted items</div>
            </div>
          </div>
          <span className="hub-pillar-badge">
            {openRequestsCount > 0 ? `${openRequestsCount} Open` : `${communityRequests.length} Feed`}
          </span>
        </div>

        {/* Pillar 3: Renting Hub */}
        <div
          className={`hub-pillar-card ${activePillar === 'renting' ? 'active' : ''}`}
          onClick={() => handlePillarChange('renting')}
        >
          <div className="hub-pillar-left">
            <div className="hub-pillar-icon">
              <Package size={22} />
            </div>
            <div>
              <div className="hub-pillar-title">3. Renting Hub</div>
              <div className="hub-pillar-desc">Borrow & lend active rentals</div>
            </div>
          </div>
          <span className="hub-pillar-badge">
            {activeRentalsCount > 0 ? `${activeRentalsCount} Active` : '0 Active'}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── PILLAR 1: RENTING HUB ────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activePillar === 'renting' && (
        <div>
          {/* Subview Segmented Selector (Borrowing vs Lending) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div className="hub-subview-toggle">
              <button
                className={`hub-subview-btn ${rentalSubView === 'borrowing' ? 'active' : ''}`}
                onClick={() => setRentalSubView('borrowing')}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                <Package size={14} style={{ marginRight: 6 }} /> Items I'm Borrowing ({borrowingRentals.length})
              </button>
              <button
                className={`hub-subview-btn ${rentalSubView === 'lending' ? 'active' : ''}`}
                onClick={() => setRentalSubView('lending')}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                <Home size={14} style={{ marginRight: 6 }} /> Items I'm Lending Out ({lendingRentals.length})
              </button>
            </div>

            {/* Filter: Active vs History */}
            <div className="rd-tabs" style={{ margin: 0, borderBottom: 'none' }}>
              <button
                className={`rd-tab ${rentalStatusFilter === 'active' ? 'rd-tab-active' : ''}`}
                onClick={() => setRentalStatusFilter('active')}
              >
                Active Rentals
              </button>
              <button
                className={`rd-tab ${rentalStatusFilter === 'history' ? 'rd-tab-active' : ''}`}
                onClick={() => setRentalStatusFilter('history')}
              >
                Rental History
              </button>
            </div>
          </div>

          {/* Rentals Content Table */}
          <div className="rd-content">
            {loading ? (
              <div className="rd-loading">
                <div className="rd-spinner" />
                <span>Loading your rentals…</span>
              </div>
            ) : currentRentalsList.length === 0 ? (
              <div className="rd-empty" style={{ padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                  <Package size={40} color="#94a3b8" />
                </div>
                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>
                  {rentalSubView === 'borrowing'
                    ? rentalStatusFilter === 'active'
                      ? 'No active borrowings right now'
                      : 'No past borrowing history'
                    : rentalStatusFilter === 'active'
                      ? 'No items currently rented out'
                      : 'No past lending history'}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 460, margin: '0 auto 18px' }}>
                  {rentalSubView === 'borrowing'
                    ? 'Need textbooks, calculators, lab coats, or cameras? Find fellow students renting out gear on campus.'
                    : 'Have gadgets, books, or equipment sitting unused? List them for rent and earn passive income!'}
                </p>
                {rentalSubView === 'borrowing' ? (
                  <button className="rd-btn rd-btn-primary" onClick={() => navigate('/marketplace?type=rent')} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Search size={14} style={{ marginRight: 6 }} /> Browse Campus Rentals
                  </button>
                ) : (
                  <button
                    className="rd-btn rd-btn-primary"
                    onClick={() => navigate('/marketplace/create', { state: { initialValues: { listingType: 'rent' } } })}
                  >
                    + List an Item for Rent
                  </button>
                )}
              </div>
            ) : (
              <div className="rd-table-wrap">
                <table className="rd-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>{rentalSubView === 'borrowing' ? 'Lent By (Owner)' : 'Rented By (Student)'}</th>
                      <th>Start Date</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Handover / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRentalsList.map((r) => {
                      const itemTitle = r.listingId?.title || r.listingId || 'Rental Item';
                      const counterpart =
                        rentalSubView === 'borrowing'
                          ? r.ownerId?.profile?.name || r.ownerId?.email || 'Campus Student'
                          : r.renterId?.profile?.name || r.renterId?.email || 'Campus Student';

                      return (
                        <tr key={r._id}>
                          <td className="rd-td-item">
                            <div>{itemTitle}</div>
                            <small style={{ color: 'var(--text-muted)' }}>ID: #{r._id.slice(-6)}</small>
                          </td>
                          <td>{counterpart}</td>
                          <td>{fmt(r.startDate)}</td>
                          <td className={r.status === 'overdue' ? 'rd-overdue-text' : ''}>
                            {fmt(r.dueDate)}
                            {r.status === 'overdue' && (
                              <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <AlertTriangle size={12} /> Overdue
                              </span>
                            )}
                          </td>
                          <td><StatusBadge status={r.status} /></td>
                          <td className="rd-actions">
                            {/* OWNER ACTIONS (Lending view) */}
                            {rentalSubView === 'lending' && r.status === 'requested' && (
                              <>
                                <button
                                  className="rd-btn rd-btn-success rd-btn-sm"
                                  onClick={() => handleStatusUpdate(r._id, 'approved', 'Rental approved!')}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Check size={13} /> Approve
                                </button>
                                <button
                                  className="rd-btn rd-btn-danger rd-btn-sm"
                                  onClick={() => handleStatusUpdate(r._id, 'cancelled', 'Rental rejected.')}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <X size={13} /> Reject
                                </button>
                              </>
                            )}
                            {rentalSubView === 'lending' && r.status === 'approved' && (
                              <button
                                className="rd-btn rd-btn-primary rd-btn-sm"
                                onClick={() => setShowQRFor(r._id)}
                                title="Show QR code for renter to scan upon handover"
                              >
                                <QrCode size={13} /> Show Handover QR
                              </button>
                            )}
                            {rentalSubView === 'lending' && (r.status === 'active' || r.status === 'overdue') && (
                              <button
                                className="rd-btn rd-btn-success rd-btn-sm"
                                onClick={() => handleConfirmReturn(r._id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <Check size={13} /> Confirm Return
                              </button>
                            )}

                            {/* RENTER ACTIONS (Borrowing view) */}
                            {rentalSubView === 'borrowing' && r.status === 'requested' && (
                              <button
                                className="rd-btn rd-btn-danger rd-btn-sm"
                                onClick={() => handleStatusUpdate(r._id, 'cancelled', 'Request cancelled.')}
                              >
                                Cancel Request
                              </button>
                            )}
                            {rentalSubView === 'borrowing' && r.status === 'approved' && (
                              <button
                                className="rd-btn rd-btn-primary rd-btn-sm"
                                onClick={() => setScanQRFor(r._id)}
                                title="Enter token from owner QR code"
                              >
                                <QrCode size={13} /> Scan / Verify QR
                              </button>
                            )}

                            {/* Done states */}
                            {(r.status === 'completed' || r.status === 'cancelled') && (
                              <span className="rd-done-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Check size={12} /> Completed
                              </span>
                            )}
                            {r.status === 'active' && rentalSubView === 'borrowing' && (
                              <span className="rd-done-label" style={{ color: '#4ade80' }}>Active Rental</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── PILLAR 2: CAMPUS REQUEST BOARD ───────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activePillar === 'requesting' && (
        <div>
          {/* Section Header */}
          <div className="hub-section-bar">
            <div>
              <span className="hub-badge-pill hub-badge-requesting">
                <ClipboardList size={12} /> Wanted Board
              </span>
              <h1 className="rd-title">Campus Request & Wanted Board</h1>
              <p className="rd-subtitle">
                Can't find what you need in the marketplace? Post your requirement so students with the item can connect, lend, or list it for you.
              </p>
            </div>
            <div>
              <button className="rd-btn rd-btn-primary" onClick={() => setShowRequestModal(true)}>
                <PlusCircle size={16} /> + Post an Item Request
              </button>
            </div>
          </div>

          {/* Subview Selector */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div className="hub-subview-toggle">
              <button
                className={`hub-subview-btn ${requestSubView === 'my_requests' ? 'active' : ''}`}
                onClick={() => setRequestSubView('my_requests')}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                <ClipboardList size={14} style={{ marginRight: 6 }} /> My Posted Requests ({myRequests.length})
              </button>
              <button
                className={`hub-subview-btn ${requestSubView === 'campus_feed' ? 'active' : ''}`}
                onClick={() => setRequestSubView('campus_feed')}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                <Handshake size={14} style={{ marginRight: 6 }} /> Campus Requests to Fulfill ({communityRequests.length})
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="rd-content">
            {loading ? (
              <div className="rd-loading">
                <div className="rd-spinner" />
                <span>Loading requests…</span>
              </div>
            ) : requestSubView === 'my_requests' ? (
              /* MY REQUESTS TABLE */
              myRequests.length === 0 ? (
                <div className="rd-empty" style={{ padding: '50px 20px', textAlign: 'center' }}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                    <ClipboardList size={40} color="#94a3b8" />
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    You haven't posted any item requests yet
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 440, margin: '0 auto 18px' }}>
                    Need a scientific calculator for end-sems, a lab kit, a textbook, or an adapter for a presentation?
                  </p>
                  <button className="rd-btn rd-btn-primary" onClick={() => setShowRequestModal(true)}>
                    + Post an Item Request
                  </button>
                </div>
              ) : (
                <div className="rd-table-wrap">
                  <table className="rd-table">
                    <thead>
                      <tr>
                        <th>Item Needed</th>
                        <th>Category</th>
                        <th>Required Dates</th>
                        <th>Budget</th>
                        <th>Notes / Urgency</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.map((req) => {
                        const days = Math.max(
                          1,
                          Math.ceil((new Date(req.dueDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24))
                        );
                        return (
                          <tr key={req._id}>
                            <td className="rd-td-item">
                              <div>{req.itemName}</div>
                            </td>
                            <td><span className="rd-tag">{req.category || 'Other'}</span></td>
                            <td>
                              <div>{fmt(req.startDate)} → {fmt(req.dueDate)}</div>
                              <small style={{ color: 'var(--text-muted)' }}>({days} day{days > 1 ? 's' : ''})</small>
                            </td>
                            <td>
                              {req.budgetPerDay ? `₹${req.budgetPerDay}/day` : <span style={{ color: 'var(--text-muted)' }}>Flexible</span>}
                            </td>
                            <td style={{ maxWidth: 220, fontSize: 13, color: 'var(--text-secondary)' }}>
                              {req.description || '—'}
                            </td>
                            <td><StatusBadge status={req.status} /></td>
                            <td className="rd-actions">
                              {req.status === 'open' ? (
                                <button
                                  className="rd-btn rd-btn-danger rd-btn-sm"
                                  onClick={() => handleCancelItemRequest(req._id)}
                                >
                                  Cancel Request
                                </button>
                              ) : (
                                <span className="rd-done-label">{req.status}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* CAMPUS COMMUNITY FEED */
              communityRequests.length === 0 ? (
                <div className="rd-empty" style={{ padding: '50px 20px', textAlign: 'center' }}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                    <Handshake size={40} color="#94a3b8" />
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    No open requests from students right now
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 440, margin: '0 auto' }}>
                    When fellow campus students post requests for items they need, they will show up here so you can help and earn rental income.
                  </p>
                </div>
              ) : (
                <div className="rd-table-wrap">
                  <table className="rd-table">
                    <thead>
                      <tr>
                        <th>Requested Item</th>
                        <th>Student</th>
                        <th>Required Dates</th>
                        <th>Offered Budget</th>
                        <th>Details</th>
                        <th>Help Student</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communityRequests.map((req) => {
                        const requesterName = req.requesterId?.profile?.name || req.requesterId?.email || 'Student';
                        const days = Math.max(
                          1,
                          Math.ceil((new Date(req.dueDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24))
                        );

                        return (
                          <tr key={req._id}>
                            <td className="rd-td-item">
                              <div>{req.itemName}</div>
                              <span className="rd-tag">{req.category || 'Other'}</span>
                            </td>
                            <td>{requesterName}</td>
                            <td>
                              <div>{fmt(req.startDate)} → {fmt(req.dueDate)}</div>
                              <small style={{ color: 'var(--text-muted)' }}>({days} day{days > 1 ? 's' : ''})</small>
                            </td>
                            <td>
                              {req.budgetPerDay ? `₹${req.budgetPerDay}/day` : <span style={{ color: 'var(--text-muted)' }}>Flexible</span>}
                            </td>
                            <td style={{ maxWidth: 220, fontSize: 13, color: 'var(--text-secondary)' }}>
                              {req.description || '—'}
                            </td>
                            <td className="rd-actions">
                              <button
                                className="rd-btn rd-btn-primary rd-btn-sm"
                                onClick={() => handleInterestedList(req)}
                                disabled={actionLoading === req._id}
                                title="Pre-fill listing and alert student"
                              >
                                <Sparkles size={13} /> {actionLoading === req._id ? 'Notifying...' : 'I Have This — List Item'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── PILLAR 3: DASHBOARD & ESCROW HANDOVER ────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activePillar === 'dashboard' && (
        <div>
          {/* Quick Metrics */}
          <div className="rd-stat-grid" style={{ marginBottom: 20 }}>
            <div
              className="rd-stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => handlePillarChange('renting')}
              title="Click to view Renting Hub"
            >
              <div className="rd-stat-icon"><Package size={22} color="#6366f1" /></div>
              <div className="rd-stat-value">{activeRentalsCount}</div>
              <div className="rd-stat-label">Active Rentals →</div>
            </div>
            <div
              className="rd-stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => handlePillarChange('requesting')}
              title="Click to view Campus Request Board"
            >
              <div className="rd-stat-icon"><Megaphone size={22} color="#8b5cf6" /></div>
              <div className="rd-stat-value">{openRequestsCount}</div>
              <div className="rd-stat-label">Open Item Requests →</div>
            </div>
            <div
              className="rd-stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setTxnFilter('pending')}
              title="Filter to awaiting handovers"
            >
              <div className="rd-stat-icon"><Handshake size={22} color="#f59e0b" /></div>
              <div className="rd-stat-value">{pendingTxnCount}</div>
              <div className="rd-stat-label">Awaiting Meetup PIN</div>
            </div>
            <div
              className="rd-stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setTxnFilter('completed')}
              title="Filter to completed transactions"
            >
              <div className="rd-stat-icon"><CreditCard size={22} color="#10b981" /></div>
              <div className="rd-stat-value">
                {transactions.filter((t) => t.status === 'completed').length}
              </div>
              <div className="rd-stat-label">Completed Deals</div>
            </div>
          </div>

          {/* Escrow Safety Guide Banner */}
          <div className="escrow-security-banner">
            <div className="escrow-security-info">
              <div className="escrow-security-icon"><ShieldCheck size={26} color="#10b981" /></div>
              <div className="escrow-security-text">
                <h5>CampusConnect In-Person Escrow Protection</h5>
                <p>
                  Funds and items are safeguarded. Only exchange the 6-digit Meetup PIN after meeting at a safe campus location and inspecting the item in person.
                </p>
              </div>
            </div>
            <div>
              <span className="rd-tag" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> Protected Meetup
              </span>
            </div>
          </div>

          {/* Transactions Filter Selector */}
          <div className="rd-tabs" style={{ marginBottom: 16 }}>
            {[
              { id: 'all', label: `All Transactions (${transactions.length})` },
              { id: 'pending', label: `Awaiting PIN Handover (${pendingTxnCount})` },
              { id: 'completed', label: 'Completed Deals' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((f) => (
              <button
                key={f.id}
                className={`rd-tab ${txnFilter === f.id ? 'rd-tab-active' : ''}`}
                onClick={() => setTxnFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Transactions Table */}
          <div className="rd-content">
            {loading ? (
              <div className="rd-loading">
                <div className="rd-spinner" />
                <span>Loading transaction records…</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rd-empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <CreditCard size={36} color="#94a3b8" />
                </div>
                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 6px' }}>No transactions in this filter</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 auto' }}>
                  Transactions are created when you buy, rent, exchange, or claim a free item on CampusConnect.
                </p>
              </div>
            ) : (
              <div className="rd-table-wrap">
                <table className="rd-table">
                  <thead>
                    <tr>
                      <th>Listing Item</th>
                      <th>Exchange Type</th>
                      <th>Price / Value</th>
                      <th>Other Party</th>
                      <th>Status</th>
                      <th>Meetup Handover / Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => {
                      const isBuyer = t.buyerId?._id === userId || t.buyerId?.toString?.() === userId;
                      const counterpart = isBuyer
                        ? t.sellerId?.profile?.name || t.sellerId?.email || 'Campus Student'
                        : t.buyerId?.profile?.name || t.buyerId?.email || 'Campus Student';
                      const myRole = isBuyer ? 'Buyer' : 'Seller';
                      const isOngoing = ['pending', 'payment_held', 'buyer_confirmed', 'seller_confirmed'].includes(t.status);
                      const alreadyConfirmed =
                        (isBuyer && t.buyerConfirmedAt) || (!isBuyer && t.sellerConfirmedAt);
                      const canConfirm = !alreadyConfirmed && isOngoing;
                      const canCancel = ['pending', 'payment_held'].includes(t.status);

                      return (
                        <tr key={t._id}>
                          <td className="rd-td-item">
                            <div style={{ fontWeight: 600 }}>{t.listingId?.title || 'Listing'}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: #{t._id?.slice(-6)}</div>
                          </td>
                          <td>
                            <span className={`rd-type-pill rd-type-${t.type}`}>{t.type}</span>
                            <span className="rd-my-role" style={{ marginLeft: 6 }}>({myRole})</span>
                          </td>
                          <td>₹{t.amount ?? 0}</td>
                          <td>{counterpart}</td>
                          <td><StatusBadge status={t.status} /></td>
                          <td className="rd-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Meetup Handover PIN buttons */}
                            {isOngoing && !isBuyer && (
                              <button
                                className="rd-btn rd-btn-sm rd-btn-pin"
                                title="Show or generate the 6-digit PIN for in-person meetup"
                                onClick={() => setShowPinFor(t)}
                              >
                                <KeyRound size={12} /> {t.handoverPin ? `PIN: ${t.handoverPin}` : 'Show PIN'}
                              </button>
                            )}
                            {isOngoing && isBuyer && (
                              <button
                                className="rd-btn rd-btn-sm rd-btn-verify"
                                title="Enter the 6-digit code provided by seller"
                                onClick={() => setVerifyPinFor(t)}
                              >
                                <KeyRound size={12} /> Enter PIN
                              </button>
                            )}

                            {/* Chat button to coordinate meetup */}
                            <button
                              className="rd-btn rd-btn-secondary rd-btn-sm"
                              title="Chat with other party to decide meetup time & place"
                              onClick={() => navigate('/chat')}
                            >
                              <MessageSquare size={12} /> Chat
                            </button>

                            {canConfirm && (
                              <button className="rd-btn rd-btn-success rd-btn-sm" onClick={() => handleConfirmTxn(t._id)}>
                                Confirm Receipt
                              </button>
                            )}
                            {canCancel && (
                              <button className="rd-btn rd-btn-danger rd-btn-sm" onClick={() => handleCancelTxn(t._id)}>
                                Cancel
                              </button>
                            )}

                            {t.status === 'completed' && (
                              <span className="rd-done-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Check size={12} /> Done
                              </span>
                            )}
                            {t.status === 'cancelled' && <span className="rd-done-label">Cancelled</span>}
                            {alreadyConfirmed && !canConfirm && t.status !== 'completed' && t.status !== 'cancelled' && (
                              <span className="rd-done-label">Awaiting other party</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
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
      {showPinFor && (
        <ShowPinModal
          transaction={showPinFor}
          onSuccess={(msg) => { showToast(msg); loadData(); }}
          onClose={() => { setShowPinFor(null); loadData(); }}
        />
      )}
      {verifyPinFor && (
        <VerifyPinModal
          transaction={verifyPinFor}
          onSuccess={(msg) => { showToast(msg); loadData(); }}
          onClose={() => { setVerifyPinFor(null); loadData(); }}
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

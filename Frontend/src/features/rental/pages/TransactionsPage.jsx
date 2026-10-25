/**
 * Charmi Bhayani (202512028) — Transactions Page
 * TransactionsPage.jsx
 *
 * Dedicated page for all buy/sell/swap/rent transactions.
 * Matches reference: stat cards, transaction list with PIN handover actions.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ReceiptText,
  Clock,
  CheckCircle2,
  XCircle,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  X,
  Check,
  Info,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Package,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  getMyTransactions,
  confirmTransaction,
  cancelTransaction,
  generateTransactionPin,
  verifyTransactionPin,
} from '../../rental/api/rentalApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getParticipantAvatar(name) {
  const colors = [
    { bg: '#e0f2fe', text: '#0369a1' },
    { bg: '#f3e8ff', text: '#7e22ce' },
    { bg: '#dcfce7', text: '#15803d' },
    { bg: '#fef3c7', text: '#b45309' },
    { bg: '#fee2e2', text: '#b91c1c' },
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
}

function StatusPill({ status }) {
  if (status === 'completed') {
    return (
      <span className="txn-status-pill txn-status-completed">
        <CheckCircle2 size={13} strokeWidth={2.2} /> Completed
      </span>
    );
  }
  if (status === 'cancelled') {
    return (
      <span className="txn-status-pill txn-status-cancelled">
        <XCircle size={13} strokeWidth={2.2} /> Cancelled
      </span>
    );
  }
  return (
    <span className="txn-status-pill txn-status-awaiting">
      <Clock size={13} strokeWidth={2.2} /> Awaiting PIN
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
    <div className={`rd-toast rd-toast-${type}`} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {type === 'success' ? <Check size={14} /> : <X size={14} />} {message}
    </div>
  );
}

// ─── Show PIN Modal (Seller) ──────────────────────────────────────────────────
function ShowPinModal({ transaction, onSuccess, onClose }) {
  const [pin, setPin] = useState(transaction?.handoverPin || '');
  const [loading, setLoading] = useState(!transaction?.handoverPin);
  const [error, setError] = useState('');

  const fetchOrGeneratePin = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await generateTransactionPin(transaction._id);
      setPin(res.pin);
      if (onSuccess) onSuccess('Meetup PIN generated!');
    } catch (err) {
      setError(err.message || 'Failed to generate PIN');
    } finally {
      setLoading(false);
    }
  }, [transaction._id]);

  useEffect(() => {
    if (!transaction?.handoverPin) fetchOrGeneratePin();
  }, [transaction._id]);

  const digits = pin ? pin.toString().padStart(6, '0').split('') : [];

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" style={{ maxWidth: 440, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}><X size={16} /></button>
        <ShieldCheck size={40} style={{ color: '#20c997', marginBottom: 8 }} />
        <h3 className="rd-modal-title">In-Person Handover PIN</h3>
        <p className="rd-modal-sub" style={{ marginBottom: 14 }}>
          Item: <strong>{transaction?.listingId?.title || 'Listing'}</strong><br />
          Show this 6-digit code to the buyer during your meetup:
        </p>
        {loading ? (
          <div className="rd-spinner" style={{ margin: '20px auto' }} />
        ) : error ? (
          <div className="rd-error-msg">{error}</div>
        ) : (
          <div className="rd-pin-display-box">
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              {digits.map((d, i) => (
                <div key={i} style={{
                  width: 40, height: 48, background: '#f8fafc', border: '1.5px solid #e2e8f0',
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', fontWeight: 800, color: '#0f172a',
                }}>
                  {d}
                </div>
              ))}
            </div>
            <p className="rd-pin-instruction">
              Buyer will enter this on their device to confirm item receipt and complete the transaction.
            </p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button className="rd-btn rd-btn-secondary" onClick={fetchOrGeneratePin} disabled={loading}>
            Regenerate PIN
          </button>
          <button className="rd-btn rd-btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── Verify PIN Modal (Buyer) ─────────────────────────────────────────────────
function VerifyPinModal({ transaction, onSuccess, onClose }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!pin.trim() || pin.trim().length !== 6) { setError('Please enter the 6-digit PIN.'); return; }
    setLoading(true); setError('');
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
        <KeyRound size={40} style={{ color: '#3b82f6', marginBottom: 8 }} />
        <h3 className="rd-modal-title">Verify Meetup Handover</h3>
        <p className="rd-modal-sub" style={{ marginBottom: 14 }}>
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
          {error && <p className="rd-error-msg" style={{ marginTop: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
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

// ─── Main Transactions Page ───────────────────────────────────────────────────
export default function TransactionsPage() {
  const { user } = useAuth();
  const userId = user?._id;
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'cancelled'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showPinFor, setShowPinFor] = useState(null);
  const [verifyPinFor, setVerifyPinFor] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyTransactions({});
      setTransactions(res.transactions || []);
    } catch (e) {
      showToast(e.message || 'Failed to load transactions.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isOngoing = (t) =>
    ['pending', 'payment_held', 'buyer_confirmed', 'seller_confirmed'].includes(t.status);

  const pendingCount = useMemo(() => transactions.filter(isOngoing).length, [transactions]);
  const completedCount = useMemo(() => transactions.filter((t) => t.status === 'completed').length, [transactions]);
  const cancelledCount = useMemo(() => transactions.filter((t) => t.status === 'cancelled').length, [transactions]);

  const processedTxns = useMemo(() => {
    let list = [...transactions];
    if (filter === 'pending') list = list.filter(isOngoing);
    else if (filter === 'completed') list = list.filter((t) => t.status === 'completed');
    else if (filter === 'cancelled') list = list.filter((t) => t.status === 'cancelled');

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((t) => {
        const title = (t.listingId?.title || '').toLowerCase();
        const isBuyer = t.buyerId?._id === userId || t.buyerId?.toString?.() === userId;
        const counterpartName = (isBuyer
          ? t.sellerId?.profile?.name || t.sellerId?.name || t.sellerId?.email
          : t.buyerId?.profile?.name || t.buyerId?.name || t.buyerId?.email || '').toLowerCase();
        return title.includes(term) || counterpartName.includes(term);
      });
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sortBy === 'highest') {
      list.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } else if (sortBy === 'lowest') {
      list.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    }

    return list;
  }, [transactions, filter, searchTerm, sortBy, userId]);

  // Find a pending PIN transaction to highlight
  const pinReadyTxn = transactions.find((t) => isOngoing(t) && t.handoverPin);

  const handleConfirmTxn = async (id) => {
    try { await confirmTransaction(id); showToast('Receipt confirmed!'); loadData(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleCancelTxn = async (id) => {
    try { await cancelTransaction(id); showToast('Transaction cancelled.'); loadData(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="rd-page">
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
      )}

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="txn-page-header">
        <div>
          <h1 className="rentals-page-title">Transactions</h1>
          <p className="rentals-page-subtitle">Track everything you've bought, sold, or swapped.</p>
        </div>
        <div className="txn-escrow-pill">
          <Info size={15} style={{ color: '#2563eb' }} />
          <span>In-person escrow: share the PIN only after you inspect the item.</span>
          <button
            type="button"
            className="txn-escrow-link"
            onClick={() => setShowHowItWorksModal(true)}
          >
            How meetup PINs work →
          </button>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <div className="rentals-stat-row">
        <div
          className={`rentals-stat-card ${filter === 'all' ? 'txn-stat-card-active-all' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="rentals-stat-icon-box box-borrowing">
            <ReceiptText size={18} strokeWidth={2.2} />
          </div>
          <div className="rentals-stat-num">{transactions.length}</div>
          <div className="rentals-stat-label">All transactions</div>
        </div>

        <div
          className={`rentals-stat-card ${filter === 'pending' ? 'txn-stat-card-active-pending' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <div className="rentals-stat-icon-box box-lending">
            <Clock size={18} strokeWidth={2.2} />
          </div>
          <div className="rentals-stat-num">{pendingCount}</div>
          <div className="rentals-stat-label">Awaiting PIN</div>
        </div>

        <div
          className={`rentals-stat-card ${filter === 'completed' ? 'txn-stat-card-active-completed' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <div className="rentals-stat-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Check size={18} strokeWidth={2.5} />
          </div>
          <div className="rentals-stat-num">{completedCount}</div>
          <div className="rentals-stat-label">Completed</div>
        </div>

        <div
          className={`rentals-stat-card ${filter === 'cancelled' ? 'txn-stat-card-active-cancelled' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          <div className="rentals-stat-icon-box" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <X size={18} strokeWidth={2.5} />
          </div>
          <div className="rentals-stat-num">{cancelledCount}</div>
          <div className="rentals-stat-label">Cancelled</div>
        </div>
      </div>

      {/* ── PIN Ready Banner (If any transaction needs PIN) ───────── */}
      {pinReadyTxn && (
        <div className="txn-pin-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <KeyRound size={18} style={{ color: '#b45309' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>
                Meetup PIN ready: {pinReadyTxn.listingId?.title || 'Listing'}
              </div>
              <div style={{ fontSize: 12, color: '#b45309' }}>
                Share it only after you have inspected the item in person.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {pinReadyTxn.handoverPin.toString().split('').map((d, i) => (
              <div key={i} style={{
                width: 36, height: 42, background: 'white', border: '1.5px solid #fcd34d',
                borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', fontWeight: 800, color: '#92400e',
              }}>
                {d}
              </div>
            ))}
            <button
              type="button"
              className="rd-btn rd-btn-sm"
              style={{ background: '#0f172a', color: 'white' }}
              onClick={() => {
                navigator.clipboard?.writeText(pinReadyTxn.handoverPin.toString());
                showToast('PIN copied to clipboard!');
              }}
            >
              Copy PIN
            </button>
          </div>
        </div>
      )}

      {/* ── Filter & Search Toolbar ───────────────────────────────── */}
      <div className="txn-filter-bar">
        <div className="txn-filter-pills">
          <button
            type="button"
            className={`txn-pill-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({transactions.length})
          </button>
          <button
            type="button"
            className={`txn-pill-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Awaiting PIN ({pendingCount})
          </button>
          <button
            type="button"
            className={`txn-pill-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({completedCount})
          </button>
          <button
            type="button"
            className={`txn-pill-btn ${filter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>

        <div className="txn-search-box">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by item name or participant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="txn-actions-right">
          <div className="txn-sort-wrap">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="txn-sort-select"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>
          </div>
          <button
            type="button"
            className="txn-filter-btn"
            onClick={() => {
              // Toggle simple reset or focus search
              if (filter !== 'all' || searchTerm) {
                setFilter('all');
                setSearchTerm('');
              }
            }}
          >
            <SlidersHorizontal size={14} /> Filter
          </button>
        </div>
      </div>

      {/* ── Transactions Table Container ──────────────────────────── */}
      <div className="txn-table-container">
        {loading ? (
          <div className="rd-loading">
            <div className="rd-spinner" />
            <span>Loading transactions…</span>
          </div>
        ) : processedTxns.length === 0 ? (
          <div className="rentals-empty-container" style={{ padding: '64px 20px', margin: '0 auto' }}>
            <div className="rentals-icon-wrapper">
              <div className="rentals-circle-icon">
                <ReceiptText size={34} strokeWidth={1.8} />
              </div>
            </div>
            <h3 className="rentals-empty-title">No transactions found</h3>
            <p className="rentals-empty-desc">
              Transactions are created when you buy, sell, swap, or rent items on CampusConnect.
            </p>
            <button
              type="button"
              className="rentals-primary-btn"
              onClick={() => navigate('/marketplace')}
            >
              <Package size={16} /> Browse Marketplace
            </button>
          </div>
        ) : (
          <div>
            <div className="txn-table-head">
              <div>Item</div>
              <div>Participant</div>
              <div>Amount</div>
              <div>Status</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>

            <div>
              {processedTxns.map((t) => {
                const isBuyer = t.buyerId?._id === userId || t.buyerId?.toString?.() === userId;
                const counterpart = isBuyer
                  ? t.sellerId?.profile?.name || t.sellerId?.name || t.sellerId?.email?.split('@')[0] || 'Student'
                  : t.buyerId?.profile?.name || t.buyerId?.name || t.buyerId?.email?.split('@')[0] || 'Student';
                const counterInitials = counterpart
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const avatarStyle = getParticipantAvatar(counterpart);
                const myRole = isBuyer ? 'Bought' : 'Sold';
                const typeLabel = t.type === 'rent' ? 'Rent' : t.type === 'exchange' ? 'Exchange' : 'Sale';
                const itemTitle = t.listingId?.title || 'Campus Item';
                const itemImage =
                  t.listingId?.images?.[0]?.thumbnailUrl ||
                  t.listingId?.images?.[0]?.url ||
                  null;
                const ongoing = isOngoing(t);

                return (
                  <div key={t._id} className="txn-table-row">
                    {/* Item */}
                    <div className="txn-item-cell">
                      {itemImage ? (
                        <img src={itemImage} alt={itemTitle} className="txn-thumb" />
                      ) : (
                        <div className="txn-thumb-placeholder">
                          <Package size={20} />
                        </div>
                      )}
                      <div className="txn-item-info">
                        <div className="txn-item-name" title={itemTitle}>{itemTitle}</div>
                        <div className="txn-item-type">{myRole} · {typeLabel}</div>
                      </div>
                    </div>

                    {/* Participant */}
                    <div className="txn-participant-cell">
                      <div
                        className="txn-participant-avatar"
                        style={{ background: avatarStyle.bg, color: avatarStyle.text }}
                      >
                        {counterInitials}
                      </div>
                      <span className="txn-participant-name">{counterpart}</span>
                    </div>

                    {/* Amount */}
                    <div className="txn-amount-cell">
                      ₹{Number(t.amount || 0).toLocaleString('en-IN')}
                    </div>

                    {/* Status */}
                    <div>
                      <StatusPill status={t.status} />
                    </div>

                    {/* Actions */}
                    <div className="txn-actions-cell">
                      {ongoing && !isBuyer && (
                        <button
                          type="button"
                          className="txn-btn-pin-action"
                          onClick={() => setShowPinFor(t)}
                        >
                          <KeyRound size={12} /> Show PIN
                        </button>
                      )}
                      {ongoing && isBuyer && (
                        <button
                          type="button"
                          className="txn-btn-pin-action"
                          onClick={() => setVerifyPinFor(t)}
                        >
                          <KeyRound size={12} /> Enter PIN
                        </button>
                      )}
                      <button
                        type="button"
                        className="txn-btn-chat"
                        onClick={() => navigate('/chat')}
                        title="Chat with participant"
                      >
                        <MessageSquare size={13} /> Chat
                      </button>
                      <button
                        type="button"
                        className="txn-btn-details"
                        onClick={() => {
                          if (t.listingId?._id) {
                            navigate(`/marketplace/${t.listingId._id}`);
                          } else {
                            showToast('Listing details not found.');
                          }
                        }}
                      >
                        View details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── How Meetup PINs Work Modal ────────────────────────────── */}
      {showHowItWorksModal && (
        <div className="rd-modal-backdrop" onClick={() => setShowHowItWorksModal(false)}>
          <div className="rd-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <button className="rd-modal-close" onClick={() => setShowHowItWorksModal(false)}>
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  How Meetup PINs Work
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#64748b' }}>
                  Safe campus exchange escrow
                </p>
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
              CampusConnect uses an in-person exchange verification protocol to keep transactions safe on campus:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                  <strong>Meet on campus:</strong> Arrange to meet in public campus spots like the Central Library foyer or Main Cafeteria.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                  <strong>Inspect the item:</strong> Check the item condition thoroughly before completing the handover.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                  <strong>Exchange PIN:</strong> The seller shows their 6-digit PIN screen, and the buyer enters it to confirm receipt and finalize the transaction.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="rentals-primary-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowHowItWorksModal(false)}
            >
              Got it, thanks!
            </button>
          </div>
        </div>
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
    </div>
  );
}

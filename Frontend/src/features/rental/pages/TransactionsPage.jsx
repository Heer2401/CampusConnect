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
  Clock,
  CheckCircle2,
  XCircle,
  AlignLeft,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  X,
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
const STATUS_STYLES = {
  pending: { label: 'Awaiting PIN', color: '#b45309', bg: '#fef3c7' },
  payment_held: { label: 'Awaiting PIN', color: '#b45309', bg: '#fef3c7' },
  buyer_confirmed: { label: 'Awaiting PIN', color: '#b45309', bg: '#fef3c7' },
  seller_confirmed: { label: 'Awaiting PIN', color: '#b45309', bg: '#fef3c7' },
  completed: { label: 'Completed', color: '#065f46', bg: '#d1fae5' },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
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

  const filteredTxns = useMemo(() => {
    if (filter === 'pending') return transactions.filter(isOngoing);
    if (filter === 'completed') return transactions.filter((t) => t.status === 'completed');
    if (filter === 'cancelled') return transactions.filter((t) => t.status === 'cancelled');
    return transactions;
  }, [transactions, filter]);

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
      <div style={{ marginBottom: 24 }}>
        <h1 className="rd-title">Transactions</h1>
        <p className="rd-subtitle">Everything you have bought, sold or swapped, with meetup PINs.</p>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <div className="rentals-stat-row" style={{ marginBottom: 24 }}>
        <div
          className={`rentals-stat-card ${filter === 'all' ? 'rentals-stat-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <AlignLeft size={18} style={{ marginBottom: 4 }} />
          <div className="rentals-stat-num">{transactions.length}</div>
          <div className="rentals-stat-label">All transactions</div>
        </div>
        <div
          className={`rentals-stat-card ${filter === 'pending' ? 'rentals-stat-due' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <Clock size={18} style={{ marginBottom: 4 }} />
          <div className="rentals-stat-num">{pendingCount}</div>
          <div className="rentals-stat-label">Awaiting PIN</div>
        </div>
        <div
          className={`rentals-stat-card ${filter === 'completed' ? 'rentals-stat-active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <CheckCircle2 size={18} style={{ marginBottom: 4 }} />
          <div className="rentals-stat-num">{completedCount}</div>
          <div className="rentals-stat-label">Completed</div>
        </div>
        <div
          className={`rentals-stat-card ${filter === 'cancelled' ? '' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          <XCircle size={18} style={{ marginBottom: 4 }} />
          <div className="rentals-stat-num">{cancelledCount}</div>
          <div className="rentals-stat-label">Cancelled</div>
        </div>
      </div>

      {/* ── PIN Ready Banner ─────────────────────────────────────── */}
      {pinReadyTxn && (
        <div className="txn-pin-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <KeyRound size={18} style={{ color: '#b45309' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>
                Meetup PIN ready: {pinReadyTxn.listingId?.title || 'Listing'}
              </div>
              <div style={{ fontSize: 12, color: '#b45309' }}>
                Share it only after you have inspected the item.
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
              className="rd-btn rd-btn-sm"
              style={{ background: '#0f172a', color: 'white' }}
              onClick={() => navigator.clipboard?.writeText(pinReadyTxn.handoverPin.toString())}
            >
              Copy PIN
            </button>
          </div>
        </div>
      )}

      {/* ── Escrow Info ───────────────────────────────────────────── */}
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
        <ShieldCheck size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        In-person escrow: share the PIN only after you inspect the item.{' '}
        <span style={{ color: '#3b82f6', cursor: 'pointer' }}>How it works</span>
      </p>

      {/* ── Transaction List ─────────────────────────────────────── */}
      <div className="rd-content">
        {loading ? (
          <div className="rd-loading">
            <div className="rd-spinner" />
            <span>Loading transactions…</span>
          </div>
        ) : filteredTxns.length === 0 ? (
          <div className="rd-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <CreditCard size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
            <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>No transactions in this filter</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
              Transactions are created when you buy, sell, swap, or rent items on CampusConnect.
            </p>
          </div>
        ) : (
          <div className="txn-list">
            {filteredTxns.map((t) => {
              const isBuyer = t.buyerId?._id === userId || t.buyerId?.toString?.() === userId;
              const counterpart = isBuyer
                ? t.sellerId?.profile?.name || t.sellerId?.email?.split('@')[0] || 'Student'
                : t.buyerId?.profile?.name || t.buyerId?.email?.split('@')[0] || 'Student';
              const counterInitials = counterpart.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
              const myRole = isBuyer ? 'Bought' : 'Sold';
              const ongoing = isOngoing(t);
              const alreadyConfirmed = (isBuyer && t.buyerConfirmedAt) || (!isBuyer && t.sellerConfirmedAt);

              return (
                <div key={t._id} className="txn-row">
                  {/* Item icon */}
                  <div className="txn-row-icon">
                    <CreditCard size={16} style={{ color: '#64748b' }} />
                  </div>

                  {/* Item Info */}
                  <div className="txn-row-info">
                    <div className="txn-row-title">{t.listingId?.title || 'Listing'}</div>
                    <div className="txn-row-sub">{myRole} · Sale</div>
                  </div>

                  {/* Counterpart */}
                  <div className="rental-row-peer">
                    <div className="req-avatar" style={{ width: 28, height: 28, fontSize: 11, background: '#e0f2fe', color: '#0369a1' }}>
                      {counterInitials}
                    </div>
                    <span>{counterpart}</span>
                  </div>

                  {/* Amount */}
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                    ₹{t.amount ?? 0}
                  </div>

                  {/* Status */}
                  <StatusPill status={t.status} />

                  {/* Actions */}
                  <div className="rental-row-actions">
                    {/* Seller: Show PIN */}
                    {ongoing && !isBuyer && (
                      <button
                        className="rd-btn rd-btn-sm rd-btn-pin"
                        onClick={() => setShowPinFor(t)}
                      >
                        <KeyRound size={12} />
                        {t.handoverPin ? `Show PIN` : 'Show PIN'}
                      </button>
                    )}
                    {/* Buyer: Enter PIN */}
                    {ongoing && isBuyer && (
                      <button
                        className="rd-btn rd-btn-sm rd-btn-verify"
                        onClick={() => setVerifyPinFor(t)}
                      >
                        <KeyRound size={12} />
                        Enter PIN
                      </button>
                    )}

                    {/* Chat */}
                    <button
                      className="rd-btn rd-btn-secondary rd-btn-sm"
                      onClick={() => navigate('/chat')}
                      title="Chat"
                    >
                      <MessageSquare size={12} />
                      Chat
                    </button>

                    {!alreadyConfirmed && ongoing && (
                      <button
                        className="rd-btn rd-btn-success rd-btn-sm"
                        onClick={() => handleConfirmTxn(t._id)}
                      >
                        Confirm
                      </button>
                    )}
                    {['pending', 'payment_held'].includes(t.status) && (
                      <button
                        className="rd-btn rd-btn-danger rd-btn-sm"
                        onClick={() => handleCancelTxn(t._id)}
                      >
                        Cancel
                      </button>
                    )}

                    {t.status === 'completed' && (
                      <span style={{ fontSize: 12, color: '#10b981' }}>Done</span>
                    )}
                    {t.status === 'cancelled' && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Cancelled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

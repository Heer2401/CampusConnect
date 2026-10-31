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
  ShieldCheck,
  X,
  Check,
  Info,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Package,
  FileText,
  Download,
  Building2,
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

// ─── Invoice Modal ────────────────────────────────────────────────────────────
function InvoiceModal({ transaction: t, currentUserId, onClose }) {
  const isBuyer =
    t.buyerId?._id === currentUserId ||
    t.buyerId?.toString?.() === currentUserId;

  const buyerName =
    t.buyerId?.profile?.name ||
    t.buyerId?.name ||
    t.buyerId?.email?.split('@')[0] ||
    'Buyer';
  const sellerName =
    t.sellerId?.profile?.name ||
    t.sellerId?.name ||
    t.sellerId?.email?.split('@')[0] ||
    'Seller';
  const buyerEmail  = t.buyerId?.email  || '—';
  const sellerEmail = t.sellerId?.email || '—';

  const itemTitle    = t.listingId?.title    || 'Campus Item';
  const itemCategory = t.listingId?.category || '—';
  const itemImage    =
    t.listingId?.images?.[0]?.thumbnailUrl ||
    t.listingId?.images?.[0]?.url ||
    null;

  const orderId    = t._id?.toString()?.slice(-10).toUpperCase() || 'N/A';
  const typeLabel  = t.type === 'exchange' ? 'Exchange' : t.type === 'giveaway' ? 'Giveaway' : 'Sale';
  const amount     = Number(t.amount || 0);
  const platformFee = t.type === 'giveaway' ? 0 : 0; // 0 for now
  const createdDate = t.createdAt
    ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const completedDate = t.completedAt
    ? new Date(t.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const statusColor =
    t.status === 'completed' ? '#16a34a' :
    t.status === 'cancelled' ? '#dc2626' : '#d97706';
  const statusLabel =
    t.status === 'completed' ? 'Completed' :
    t.status === 'cancelled' ? 'Cancelled' : 'In Progress';

  const handleDownload = () => {
    // Create a hidden iframe with the invoice HTML and print it
    const invoiceEl = document.getElementById('cc-invoice-printable');
    if (!invoiceEl) return;

    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>CampusConnect Invoice #${orderId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; }
          .inv-wrap { max-width: 740px; margin: 0 auto; padding: 40px 48px; }

          /* Header */
          .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
          .inv-logo-box { display: flex; align-items: center; gap: 10px; }
          .inv-logo-icon { width: 44px; height: 44px; background: linear-gradient(135deg,#2563eb,#7c3aed); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
          .inv-logo-icon svg { width: 24px; height: 24px; fill: none; stroke: #fff; stroke-width: 2; }
          .inv-brand { font-size: 20px; font-weight: 800; color: #0f172a; }
          .inv-brand span { color: #2563eb; }
          .inv-tagline { font-size: 11px; color: #64748b; margin-top: 2px; }
          .inv-header-right { text-align: right; }
          .inv-title { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
          .inv-number { font-size: 13px; color: #64748b; margin-top: 4px; }
          .inv-number strong { color: #2563eb; }

          /* Divider */
          .inv-divider { height: 2px; background: linear-gradient(to right, #2563eb, #7c3aed, transparent); border: none; margin: 0 0 32px 0; }

          /* Dates row */
          .inv-dates { display: flex; gap: 32px; margin-bottom: 32px; }
          .inv-date-block label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; display: block; margin-bottom: 4px; }
          .inv-date-block span { font-size: 13px; font-weight: 600; color: #334155; }

          /* Parties */
          .inv-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
          .inv-party { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; }
          .inv-party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 10px; }
          .inv-party-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .inv-party-email { font-size: 12px; color: #64748b; }
          .inv-party-badge { display: inline-block; margin-top: 8px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: #dbeafe; color: #1e40af; }

          /* Item table */
          .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .inv-table thead tr { background: #0f172a; color: #fff; }
          .inv-table thead th { padding: 12px 16px; font-size: 12px; font-weight: 600; text-align: left; }
          .inv-table tbody tr { border-bottom: 1px solid #f1f5f9; }
          .inv-table tbody tr:last-child { border-bottom: none; }
          .inv-table tbody td { padding: 16px; font-size: 13px; color: #334155; }
          .inv-table tfoot tr { background: #f8fafc; }
          .inv-table tfoot td { padding: 12px 16px; font-size: 13px; font-weight: 700; color: #0f172a; }
          .inv-table tfoot td:last-child { color: #2563eb; font-size: 15px; }

          /* Status badge */
          .inv-status { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
          .inv-status.completed { background: #dcfce7; color: #16a34a; }
          .inv-status.cancelled { background: #fee2e2; color: #dc2626; }
          .inv-status.pending   { background: #fef3c7; color: #d97706; }

          /* Footer */
          .inv-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .inv-footer-note { font-size: 11px; color: #94a3b8; max-width: 360px; line-height: 1.5; }
          .inv-footer-brand { font-size: 12px; color: #64748b; text-align: right; }

          /* Watermark for cancelled */
          .inv-cancelled-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(220,38,38,0.08); pointer-events: none; letter-spacing: 8px; }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 0.4in; size: A4; }
          }
        </style>
      </head>
      <body>
        ${t.status === 'cancelled' ? '<div class="inv-cancelled-watermark">CANCELLED</div>' : ''}
        <div class="inv-wrap">
          <div class="inv-header">
            <div class="inv-logo-box">
              <div class="inv-logo-icon">
                <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>
              </div>
              <div>
                <div class="inv-brand">Campus<span>Connect</span></div>
                <div class="inv-tagline">Student Marketplace Platform</div>
              </div>
            </div>
            <div class="inv-header-right">
              <div class="inv-title">INVOICE</div>
              <div class="inv-number">Order <strong>#${orderId}</strong></div>
            </div>
          </div>

          <hr class="inv-divider" />

          <div class="inv-dates">
            <div class="inv-date-block"><label>Issue Date</label><span>${createdDate}</span></div>
            <div class="inv-date-block"><label>Completion Date</label><span>${t.status === 'completed' ? completedDate : '—'}</span></div>
            <div class="inv-date-block"><label>Transaction Type</label><span>${typeLabel}</span></div>
            <div class="inv-date-block">
              <label>Status</label>
              <span class="inv-status ${t.status === 'completed' ? 'completed' : t.status === 'cancelled' ? 'cancelled' : 'pending'}">
                ${statusLabel}
              </span>
            </div>
          </div>

          <div class="inv-parties">
            <div class="inv-party">
              <div class="inv-party-label">Seller (From)</div>
              <div class="inv-party-name">${sellerName}</div>
              <div class="inv-party-email">${sellerEmail}</div>
              <span class="inv-party-badge">SELLER</span>
            </div>
            <div class="inv-party">
              <div class="inv-party-label">Buyer (To)</div>
              <div class="inv-party-name">${buyerName}</div>
              <div class="inv-party-email">${buyerEmail}</div>
              <span class="inv-party-badge" style="background:#f3e8ff;color:#7e22ce;">BUYER</span>
            </div>
          </div>

          <table class="inv-table">
            <thead>
              <tr>
                <th style="width:40%">Item Description</th>
                <th>Category</th>
                <th>Type</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${itemTitle}</strong></td>
                <td>${itemCategory}</td>
                <td>${typeLabel}</td>
                <td style="text-align:right;font-weight:700">${t.type === 'giveaway' ? 'FREE' : '\u20B9' + amount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align:right">Platform Fee</td>
                <td style="text-align:right;color:#64748b">\u20B90.00</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align:right">Total Amount</td>
                <td style="text-align:right">${t.type === 'giveaway' ? 'FREE' : '\u20B9' + amount.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>

          <div class="inv-footer">
            <div class="inv-footer-note">
              This invoice is auto-generated by CampusConnect for record-keeping purposes.
              Transactions are peer-to-peer and subject to CampusConnect&apos;s community guidelines.
              For disputes, contact support@campusconnect.in.
            </div>
            <div class="inv-footer-brand">
              <strong>CampusConnect</strong><br/>
              campusconnect.in<br/>
              Generated: ${new Date().toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div
        className="rd-modal"
        style={{ maxWidth: 740, padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px', borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#fff' }}>Transaction Invoice</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Order #{orderId}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDownload}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Download size={14} /> Download PDF
            </button>
            <button className="rd-modal-close" onClick={onClose} style={{ position: 'relative', top: 'unset', right: 'unset', margin: 0 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Invoice Preview ── */}
        <div id="cc-invoice-printable" style={{ padding: '32px 36px', overflowY: 'auto', maxHeight: '70vh' }}>

          {/* Brand + Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
                  Campus<span style={{ color: '#2563eb' }}>Connect</span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Student Marketplace Platform</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: -0.5 }}>INVOICE</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Order <strong style={{ color: '#2563eb' }}>#{orderId}</strong>
              </div>
            </div>
          </div>

          {/* Gradient divider */}
          <div style={{
            height: 3, borderRadius: 99,
            background: 'linear-gradient(to right,#2563eb,#7c3aed,transparent)',
            marginBottom: 28,
          }} />

          {/* Dates row */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
            {[
              { label: 'Issue Date', value: createdDate },
              { label: 'Completion Date', value: t.status === 'completed' ? completedDate : '—' },
              { label: 'Transaction Type', value: typeLabel },
              {
                label: 'Status',
                value: (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: t.status === 'completed' ? '#dcfce7' : t.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                    color: statusColor,
                    borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                  }}>
                    {statusLabel}
                  </span>
                ),
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Parties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            {[
              { role: 'SELLER', name: sellerName, email: sellerEmail, badgeBg: '#dbeafe', badgeColor: '#1e40af' },
              { role: 'BUYER',  name: buyerName,  email: buyerEmail,  badgeBg: '#f3e8ff', badgeColor: '#7e22ce' },
            ].map(({ role, name, email, badgeBg, badgeColor }) => (
              <div key={role} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 12, padding: '16px 18px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: 8 }}>
                  {role === 'SELLER' ? 'Seller (From)' : 'Buyer (To)'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{email}</div>
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: badgeBg, color: badgeColor }}>
                  {role}
                </span>
              </div>
            ))}
          </div>

          {/* Item row */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              background: '#0f172a', color: '#fff',
              padding: '11px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              <span>Item Description</span>
              <span>Category</span>
              <span>Type</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '16px 18px', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {itemImage ? (
                  <img src={itemImage} alt={itemTitle} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={20} color="#94a3b8" />
                  </div>
                )}
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{itemTitle}</span>
              </div>
              <span style={{ color: '#64748b', fontSize: 13 }}>{itemCategory}</span>
              <span style={{ color: '#64748b', fontSize: 13 }}>{typeLabel}</span>
              <span style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: 15 }}>
                {t.type === 'giveaway' ? 'FREE' : `₹${amount.toLocaleString('en-IN')}`}
              </span>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40, padding: '12px 18px', background: '#f8fafc', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Platform Fee</span>
                <span style={{ fontWeight: 600, color: '#64748b' }}>₹0.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40, padding: '12px 18px 14px', background: '#f8fafc', fontSize: 15, borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Total</span>
                <span style={{ fontWeight: 900, color: '#2563eb' }}>
                  {t.type === 'giveaway' ? 'FREE' : `₹${amount.toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            paddingTop: 18, borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12,
          }}>
            <p style={{ fontSize: 11, color: '#94a3b8', maxWidth: 380, lineHeight: 1.6 }}>
              This invoice is auto-generated by CampusConnect for record-keeping purposes.
              Transactions are peer-to-peer and governed by our community guidelines.
              For disputes, contact{' '}
              <strong style={{ color: '#64748b' }}>support@campusconnect.in</strong>.
            </p>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8' }}>
              <strong style={{ color: '#64748b' }}>CampusConnect</strong><br />
              campusconnect.in<br />
              Generated: {new Date().toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>
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
  const [invoiceFor,   setInvoiceFor]   = useState(null);

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

  // Find a pending PIN transaction to highlight — strictly for the SELLER
  const pinReadyTxn = transactions.find((t) => {
    const isSeller = (t.sellerId?._id || t.sellerId)?.toString() === userId?.toString();
    return isOngoing(t) && t.handoverPin && isSeller;
  });

  const handleConfirmTxn = async (id) => {
    try { await confirmTransaction(id); showToast('Receipt confirmed!'); loadData(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleCancelTxn = async (id) => {
    try { await cancelTransaction(id); showToast('Transaction cancelled.'); loadData(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="transactions-page-wrapper">
      <div className="transactions-page-container">
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
          className={`rentals-stat-card card-mint ${filter === 'all' ? 'active-card txn-stat-card-active-all' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="rentals-stat-icon-box box-mint">
            <ReceiptText size={18} strokeWidth={2.2} />
          </div>
          <div className="rentals-stat-num">{transactions.length}</div>
          <div className="rentals-stat-label">All transactions</div>
        </div>

        <div
          className={`rentals-stat-card card-blue ${filter === 'pending' ? 'active-card txn-stat-card-active-pending' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <div className="rentals-stat-icon-box box-blue">
            <Clock size={18} strokeWidth={2.2} />
          </div>
          <div className="rentals-stat-num">{pendingCount}</div>
          <div className="rentals-stat-label">Awaiting PIN</div>
        </div>

        <div
          className={`rentals-stat-card card-completed ${filter === 'completed' ? 'active-card txn-stat-card-active-completed' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <div className="rentals-stat-icon-box box-completed">
            <Check size={18} strokeWidth={2.5} />
          </div>
          <div className="rentals-stat-num">{completedCount}</div>
          <div className="rentals-stat-label">Completed</div>
        </div>

        <div
          className={`rentals-stat-card card-cancelled ${filter === 'cancelled' ? 'active-card txn-stat-card-active-cancelled' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          <div className="rentals-stat-icon-box box-cancelled">
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
                  ? counterpart.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'ST'
                  : 'ST';
                const avatarStyle = getParticipantAvatar(counterpart);
                const myRole = isBuyer ? 'Bought' : 'Sold';
                const typeLabel = t.type === 'rent' ? 'Rent' : t.type === 'exchange' ? 'Exchange' : 'Sale';
                const itemTitle = t.listingId?.title || 'Campus Item';
                const itemImage =
                  t.listingId?.images?.[0]?.thumbnailUrl ||
                  t.listingId?.images?.[0]?.url ||
                  null;
                const ongoing = isOngoing(t);

                const targetListingId =
                  t.listingId?._id ||
                  t.listingId?.id ||
                  (typeof t.listingId === 'string' ? t.listingId : null);

                const handleOpenListingDetails = () => {
                  if (targetListingId) {
                    navigate(`/marketplace/${targetListingId}`);
                  } else {
                    showToast('Listing details not found.', 'error');
                  }
                };

                return (
                  <div key={t._id} className="txn-table-row">
                    {/* Item */}
                    <div className="txn-item-cell">
                      {itemImage ? (
                        <img
                          src={itemImage}
                          alt={itemTitle}
                          className="txn-thumb txn-thumb-clickable"
                          onClick={handleOpenListingDetails}
                          title={`View details for ${itemTitle}`}
                        />
                      ) : (
                        <div
                          className="txn-thumb-placeholder txn-thumb-clickable"
                          onClick={handleOpenListingDetails}
                          title={`View details for ${itemTitle}`}
                        >
                          <Package size={20} />
                        </div>
                      )}
                      <div className="txn-item-info">
                        <div
                          className="txn-item-name txn-item-name-clickable"
                          title={`View details for ${itemTitle}`}
                          onClick={handleOpenListingDetails}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleOpenListingDetails();
                          }}
                        >
                          {itemTitle}
                        </div>
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
                    <div className="txn-status-cell">
                      <StatusPill status={t.status} />
                    </div>

                    {/* Actions: Strictly 1 action button */}
                    <div className="txn-actions-cell">
                      {ongoing ? (
                        isBuyer ? (
                          <button
                            type="button"
                            className="txn-btn-pin-action"
                            onClick={() => setVerifyPinFor(t)}
                          >
                            <KeyRound size={12} /> Enter PIN
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="txn-btn-pin-action"
                            onClick={() => setShowPinFor(t)}
                          >
                            <KeyRound size={12} /> Show PIN
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className="txn-btn-invoice"
                          onClick={() => setInvoiceFor(t)}
                          title="View & Download Invoice"
                        >
                          <FileText size={12} /> Invoice
                        </button>
                      )}
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
      {invoiceFor && (
        <InvoiceModal
          transaction={invoiceFor}
          currentUserId={userId}
          onClose={() => setInvoiceFor(null)}
        />
      )}
      </div>
    </div>
  );
}

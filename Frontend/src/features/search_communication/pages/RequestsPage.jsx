/**
 * Charmi Bhayani (202512028) — Campus Request Board
 * RequestsPage.jsx
 *
 * Dedicated page for viewing and posting campus item requests.
 * Shows all student requests and lets you post your own or fulfill others.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  PlusCircle,
  Search,
  Clock,
  MapPin,
  DollarSign,
  MessageSquare,
  Sparkles,
  Filter,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  createRentalRequest,
  getMyRentalRequests,
  getAllRentalRequests,
  cancelRentalRequest,
  notifyItemListing,
} from '../../rental/api/rentalApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : '—';

const STATUS_STYLES = {
  open: 'status-active',
  fulfilled: 'status-completed',
  cancelled: 'status-cancelled',
};

function StatusBadge({ status }) {
  return (
    <span className={`rd-badge ${STATUS_STYLES[status] || 'status-requested'}`}>
      {status}
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

// ─── Post Request Modal ────────────────────────────────────────────────────────
function PostRequestModal({ onSuccess, onClose }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    itemName: '',
    category: 'Electronics',
    startDate: todayStr,
    dueDate: '',
    budgetPerDay: '',
    description: '',
    meetupSpot: '',
    requestType: 'Borrow',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.itemName.trim()) { setError('Please enter the item you need.'); return; }
    if (!form.dueDate) { setError('Please enter a needed-by date.'); return; }
    setLoading(true); setError('');
    try {
      await createRentalRequest({
        itemName: form.itemName.trim(),
        category: form.category,
        startDate: form.startDate,
        dueDate: form.dueDate,
        budgetPerDay: form.budgetPerDay ? Number(form.budgetPerDay) : null,
        description: form.description.trim(),
      });
      onSuccess('Request posted! Students who own this item will be notified.');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to post request.');
    } finally {
      setLoading(false);
    }
  };

  const quickItems = ['Calculator', 'Lab coat', 'Textbook', 'Adapter', 'Charger'];

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal-close" onClick={onClose}><X size={16} /></button>
        <h3 className="rd-modal-title">Post a Request</h3>
        <p className="rd-modal-sub">
          Can't find it in the marketplace? Tell the campus what item you need.
        </p>

        {/* Quick fill suggestions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {quickItems.map((item) => (
            <button
              key={item}
              type="button"
              className="rd-tag"
              style={{ cursor: 'pointer', border: '1px solid #e2e8f0' }}
              onClick={() => setForm({ ...form, itemName: item })}
            >
              {item}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <label className="rd-label">What do you need *</label>
          <input
            className="rd-input"
            placeholder="e.g. Scientific calculator, Lab coat, USB adapter..."
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            autoFocus
          />

          <div className="rd-grid-2">
            <div>
              <label className="rd-label">Budget</label>
              <input
                className="rd-input"
                type="number"
                min="0"
                placeholder="Up to 150"
                value={form.budgetPerDay}
                onChange={(e) => setForm({ ...form, budgetPerDay: e.target.value })}
              />
            </div>
            <div>
              <label className="rd-label">Needed by *</label>
              <input
                className="rd-input"
                type="date"
                min={todayStr}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <label className="rd-label">Meetup spot (optional)</label>
          <input
            className="rd-input"
            placeholder="e.g. Library, Hostel B, Block C..."
            value={form.meetupSpot}
            onChange={(e) => setForm({ ...form, meetupSpot: e.target.value })}
          />

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['Borrow', 'Buy', 'Either'].map((type) => (
              <button
                key={type}
                type="button"
                className={`rd-btn rd-btn-sm ${form.requestType === type ? 'rd-btn-primary' : 'rd-btn-secondary'}`}
                onClick={() => setForm({ ...form, requestType: type })}
              >
                {type}
              </button>
            ))}
          </div>

          {error && <p className="rd-error-msg">{error}</p>}

          <button type="submit" className="rd-btn rd-btn-primary" disabled={loading} style={{ width: '100%', marginTop: 12 }}>
            {loading ? 'Posting...' : 'Post request'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Requests Page ────────────────────────────────────────────────────────
export default function RequestsPage() {
  const { user } = useAuth();
  const userId = user?._id;
  const navigate = useNavigate();

  const [tab, setTab] = useState('all'); // 'all' | 'mine'
  const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'Rent' | 'Buy' | 'Borrow'
  const [myRequests, setMyRequests] = useState([]);
  const [communityRequests, setCommunityRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showPostModal, setShowPostModal] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, allRes] = await Promise.all([
        getMyRentalRequests(),
        getAllRentalRequests(),
      ]);
      setMyRequests(myRes.requests || []);
      setCommunityRequests(allRes.requests || []);
    } catch (e) {
      showToast(e.message || 'Failed to load requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCancelRequest = async (id) => {
    try {
      await cancelRentalRequest(id);
      showToast('Request cancelled.');
      loadData();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleIHaveThis = async (req) => {
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
            },
          },
        });
      }, 500);
    } catch (e) {
      showToast(e.message || 'Failed to notify student.', 'error');
      setActionLoading(null);
    }
  };

  // Requests to show in the feed (all campus requests, excluding own)
  const feedRequests = communityRequests.filter(
    (r) => r.requesterId?._id?.toString() !== userId?.toString()
  );

  const displayedRequests = tab === 'all' ? feedRequests : myRequests;
  const allCount = feedRequests.filter((r) => r.status === 'open').length;
  const myCount = myRequests.length;

  return (
    <div className="rd-page">
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="requests-page-header">
        <div>
          <h1 className="rd-title">Requests</h1>
          <p className="rd-subtitle">
            What students on campus are looking for. Have one of these? Say so.
          </p>
        </div>
      </div>

      {/* ── Layout: Left Feed + Right Post Form ──────────────────── */}
      <div className="requests-layout">
        {/* Left: Request Feed */}
        <div className="requests-feed">
          {/* Tab Switcher */}
          <div className="requests-tabs">
            <button
              className={`req-tab ${tab === 'all' ? 'req-tab-active' : ''}`}
              onClick={() => setTab('all')}
            >
              All requests {allCount > 0 && <span className="req-count">{allCount}</span>}
            </button>
            <button
              className={`req-tab ${tab === 'mine' ? 'req-tab-active' : ''}`}
              onClick={() => setTab('mine')}
            >
              My requests {myCount > 0 && <span className="req-count">{myCount}</span>}
            </button>
          </div>

          {/* Type Filter */}
          <div className="requests-type-filter">
            {['All', 'Rent', 'Buy', 'Borrow'].map((t) => (
              <button
                key={t}
                className={`req-type-pill ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Request Cards */}
          {loading ? (
            <div className="rd-loading">
              <div className="rd-spinner" />
              <span>Loading requests…</span>
            </div>
          ) : displayedRequests.length === 0 ? (
            <div className="rd-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <ClipboardList size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {tab === 'all' ? 'No open requests from other students yet' : "You haven't posted any requests yet"}
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 380, margin: '0 auto 16px' }}>
                {tab === 'all'
                  ? 'When students post item requests they will appear here.'
                  : "Can't find what you need? Post a request so campus peers can help."}
              </p>
              <button className="rd-btn rd-btn-primary" onClick={() => setShowPostModal(true)}>
                <PlusCircle size={15} /> Post a Request
              </button>
            </div>
          ) : (
            <div className="req-cards-list">
              {displayedRequests.map((req) => {
                const requesterName =
                  req.requesterId?.profile?.name || req.requesterId?.email?.split('@')[0] || 'Student';
                const initials = requesterName.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
                const isOwn = req.requesterId?._id?.toString() === userId?.toString();
                const days = req.startDate && req.dueDate
                  ? Math.max(1, Math.ceil((new Date(req.dueDate) - new Date(req.startDate)) / 86400000))
                  : null;

                return (
                  <div key={req._id} className="req-card">
                    <div className="req-card-top">
                      <div className="req-card-left">
                        <div className="req-avatar" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                          {initials}
                        </div>
                        <div>
                          <div className="req-card-title">{req.itemName}</div>
                          <div className="req-card-meta">
                            Asked by {requesterName} · Posted{' '}
                            {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                      </div>
                      <span className={`req-type-badge req-type-${(req.requestType || 'Borrow').toLowerCase()}`}>
                        {req.requestType || 'Borrow'}
                      </span>
                    </div>

                    <div className="req-card-details">
                      {req.dueDate && (
                        <span className="req-detail-chip">
                          <Clock size={12} />
                          Needed by {fmt(req.dueDate)}
                        </span>
                      )}
                      {req.budgetPerDay && (
                        <span className="req-detail-chip">
                          <DollarSign size={12} />
                          Up to ₹{req.budgetPerDay}
                        </span>
                      )}
                      {req.description && (
                        <span className="req-detail-chip">
                          <MapPin size={12} />
                          {req.description.slice(0, 30)}
                          {req.description.length > 30 ? '…' : ''}
                        </span>
                      )}
                    </div>

                    <div className="req-card-actions">
                      {isOwn ? (
                        <>
                          <StatusBadge status={req.status} />
                          {req.status === 'open' && (
                            <button
                              className="rd-btn rd-btn-danger rd-btn-sm"
                              onClick={() => handleCancelRequest(req._id)}
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            className="rd-btn rd-btn-primary rd-btn-sm"
                            onClick={() => handleIHaveThis(req)}
                            disabled={actionLoading === req._id}
                          >
                            <Sparkles size={13} />
                            {actionLoading === req._id ? 'Notifying...' : 'I have this'}
                          </button>
                          <button
                            className="rd-btn rd-btn-secondary rd-btn-sm"
                            onClick={() => navigate('/chat')}
                          >
                            <MessageSquare size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Post a Request Sidebar */}
        <div className="requests-sidebar">
          <div className="req-post-panel">
            <h3 className="req-post-title">Post a request</h3>
            <p className="req-post-sub">
              Can't find it in the marketplace? Tell the campus what item you need.
            </p>

            <InlinePostForm onSuccess={showToast} onRefresh={loadData} />
          </div>
        </div>
      </div>

      {showPostModal && (
        <PostRequestModal
          onSuccess={(msg) => { showToast(msg); loadData(); }}
          onClose={() => setShowPostModal(false)}
        />
      )}
    </div>
  );
}

// ─── Inline Post Form (sidebar) ───────────────────────────────────────────────
function InlinePostForm({ onSuccess, onRefresh }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    itemName: '',
    budgetPerDay: '',
    dueDate: '',
    meetupSpot: '',
    requestType: 'Borrow',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickItems = ['Calculator', 'Lab coat', 'Textbook', 'Adapter'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemName.trim()) { setError('Enter the item you need.'); return; }
    if (!form.dueDate) { setError('Enter a needed-by date.'); return; }
    setLoading(true); setError('');
    try {
      await createRentalRequest({
        itemName: form.itemName.trim(),
        category: 'Other',
        startDate: todayStr,
        dueDate: form.dueDate,
        budgetPerDay: form.budgetPerDay ? Number(form.budgetPerDay) : null,
        description: form.meetupSpot ? `Meetup: ${form.meetupSpot}` : '',
      });
      onSuccess('Request posted! Students will be notified.');
      onRefresh();
      setForm({ itemName: '', budgetPerDay: '', dueDate: '', meetupSpot: '', requestType: 'Borrow' });
    } catch (err) {
      setError(err.message || 'Failed to post request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {quickItems.map((item) => (
          <button
            key={item}
            type="button"
            className="rd-tag"
            style={{ cursor: 'pointer', border: '1px solid #e2e8f0', fontSize: 12 }}
            onClick={() => setForm({ ...form, itemName: item })}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="rd-label" style={{ color: '#374151' }}>What do you need</label>
      <input
        className="rd-input rd-input-light"
        placeholder="Scientific calculator"
        value={form.itemName}
        onChange={(e) => setForm({ ...form, itemName: e.target.value })}
      />

      <div className="rd-grid-2">
        <div>
          <label className="rd-label" style={{ color: '#374151' }}>Budget</label>
          <input
            className="rd-input rd-input-light"
            type="number"
            placeholder="Up to 150"
            value={form.budgetPerDay}
            onChange={(e) => setForm({ ...form, budgetPerDay: e.target.value })}
          />
        </div>
        <div>
          <label className="rd-label" style={{ color: '#374151' }}>Needed by</label>
          <input
            className="rd-input rd-input-light"
            type="date"
            min={todayStr}
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
      </div>

      <label className="rd-label" style={{ color: '#374151' }}>Meetup spot</label>
      <input
        className="rd-input rd-input-light"
        placeholder="Library"
        value={form.meetupSpot}
        onChange={(e) => setForm({ ...form, meetupSpot: e.target.value })}
      />

      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        {['Borrow', 'Buy', 'Either'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setForm({ ...form, requestType: type })}
            className={`req-type-toggle-btn ${form.requestType === type ? 'active' : ''}`}
          >
            {type}
          </button>
        ))}
      </div>

      {error && <p className="rd-error-msg">{error}</p>}

      <button
        type="submit"
        className="rd-btn rd-btn-primary"
        disabled={loading}
        style={{ width: '100%', marginTop: 8 }}
      >
        {loading ? 'Posting…' : 'Post request'}
      </button>
    </form>
  );
}

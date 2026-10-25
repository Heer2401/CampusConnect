/**
 * Charmi Bhayani (202512028) — Campus Request Board
 * RequestsPage.jsx
 *
 * Dedicated page for viewing and posting campus item requests.
 * Matches clean modern aesthetic with two-column layout:
 * - Left: Request feed with tabs, filters, and empty-state illustration
 * - Right: Inline "Post a request" form with quick suggestion chips
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Clock,
  MapPin,
  DollarSign,
  MessageSquare,
  Sparkles,
  Send,
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
    <div
      className={`rd-toast rd-toast-${type}`}
      onClick={onClose}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      {type === 'success' ? <Check size={14} /> : <X size={14} />} {message}
    </div>
  );
}

// ─── Empty State SVG Illustration ─────────────────────────────────────────────
function RequestEmptyIllustration() {
  return (
    <div className="req-empty-illustration">
      <svg width="112" height="112" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft aura background */}
        <circle cx="70" cy="72" r="48" fill="#f0f7ff" />

        {/* Burst rays around aura */}
        <line x1="70" y1="12" x2="70" y2="18" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="28" x2="37" y2="33" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="108" y1="28" x2="103" y2="33" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="68" x2="26" y2="68" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="114" y1="68" x2="120" y2="68" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />

        {/* Botanical leaves bottom left */}
        <path d="M42 98C40 92 44 86 50 86C50 92 46 98 42 98Z" fill="#86efac" />
        <path d="M36 104C36 98 42 94 48 96C46 102 40 106 36 104Z" fill="#4ade80" />
        <path d="M42 102C44 96 48 92 52 90" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />

        {/* Botanical leaves bottom right */}
        <path d="M98 98C100 92 96 86 90 86C90 92 94 98 98 98Z" fill="#86efac" />
        <path d="M104 104C104 98 98 94 92 96C94 102 100 106 104 104Z" fill="#4ade80" />
        <path d="M98 102C96 96 92 92 88 90" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />

        {/* Clipboard backboard */}
        <rect x="44" y="32" width="52" height="72" rx="7" fill="#bfdbfe" />
        <rect x="46" y="34" width="48" height="68" rx="6" fill="#dbeafe" />

        {/* White paper */}
        <rect x="49" y="42" width="42" height="56" rx="4" fill="#ffffff" />

        {/* Top clip loop & clamp */}
        <rect x="62" y="24" width="16" height="10" rx="3" fill="#2563eb" />
        <rect x="66" y="26" width="8" height="6" rx="2" fill="#ffffff" />
        <rect x="58" y="31" width="24" height="6" rx="2" fill="#1d4ed8" />

        {/* Checklist lines on paper */}
        <circle cx="56" cy="52" r="2.5" fill="#3b82f6" />
        <rect x="62" y="50.5" width="22" height="3" rx="1.5" fill="#93c5fd" />

        <circle cx="56" cy="62" r="2.5" fill="#3b82f6" />
        <rect x="62" y="60.5" width="22" height="3" rx="1.5" fill="#93c5fd" />

        <circle cx="56" cy="72" r="2.5" fill="#3b82f6" />
        <rect x="62" y="70.5" width="18" height="3" rx="1.5" fill="#93c5fd" />

        <circle cx="56" cy="82" r="2.5" fill="#3b82f6" />
        <rect x="62" y="80.5" width="20" height="3" rx="1.5" fill="#93c5fd" />
      </svg>
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

  // Right sidebar form state
  const todayStr = new Date().toISOString().split('T')[0];
  const itemInputRef = useRef(null);
  const [postForm, setPostForm] = useState({
    itemName: '',
    budgetPerDay: '',
    dueDate: '',
    meetupSpot: '',
    requestType: 'Borrow',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelRequest = async (id) => {
    try {
      await cancelRentalRequest(id);
      showToast('Request cancelled.');
      loadData();
    } catch (e) {
      showToast(e.message, 'error');
    }
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
              categoryName: req.category || 'Other',
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

  // Quick suggestion click
  const handleSuggestionClick = (name) => {
    setPostForm((prev) => ({ ...prev, itemName: name }));
    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }
  };

  // Focus post form from empty state button
  const handleFocusPostForm = () => {
    if (itemInputRef.current) {
      itemInputRef.current.focus();
      itemInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Submit new request
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postForm.itemName.trim()) {
      setFormError('Please enter what item you need.');
      return;
    }
    if (!postForm.dueDate) {
      setFormError('Please select a needed-by date.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      // Ensure due date has end-of-day timestamp so start < due passes validation
      const dueDateIso = `${postForm.dueDate}T23:59:59.999Z`;
      const desc = [
        postForm.meetupSpot ? `Meetup: ${postForm.meetupSpot}` : '',
        `Type: ${postForm.requestType}`,
      ].filter(Boolean).join(' | ');

      await createRentalRequest({
        itemName: postForm.itemName.trim(),
        category: 'Other',
        startDate: new Date().toISOString(),
        dueDate: dueDateIso,
        budgetPerDay: postForm.budgetPerDay ? Number(postForm.budgetPerDay) : null,
        description: desc,
      });

      showToast('Request posted! Campus students can now see what you need.');
      setPostForm({
        itemName: '',
        budgetPerDay: '',
        dueDate: '',
        meetupSpot: '',
        requestType: 'Borrow',
      });
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to post request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter requests
  const feedRequests = communityRequests.filter(
    (r) => r.requesterId?._id?.toString() !== userId?.toString()
  );

  const baseList = tab === 'all' ? feedRequests : myRequests;
  const filteredList = baseList.filter((req) => {
    if (typeFilter === 'All') return true;
    const reqType = (
      req.requestType ||
      (req.description?.includes('Type: Buy')
        ? 'Buy'
        : req.description?.includes('Type: Either')
        ? 'Either'
        : 'Borrow')
    ).toLowerCase();
    return reqType.includes(typeFilter.toLowerCase());
  });

  const myCount = myRequests.length;
  const isEmpty = !loading && filteredList.length === 0;

  return (
    <div className="requests-page-container">
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '' })}
        />
      )}

      {/* ── Layout: Left Feed + Right Post Form ──────────────────── */}
      <div className={`requests-layout-grid ${isEmpty ? 'requests-grid-empty' : ''}`}>
        {/* Left Column: Requests Feed */}
        <div className="requests-feed-col">
          {/* ── Page Header ────────────────────────────────────────── */}
          <div className="requests-header">
            <h1 className="requests-header-title">Requests</h1>
            <p className="requests-header-sub">
              What students on campus are looking for. Have one of these? Say so.
            </p>
          </div>

          {/* Row 1: All requests / My requests */}
          <div className="requests-tabs-row">
            <button
              className={`req-pill-tab ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              All requests
            </button>
            <button
              className={`req-pill-tab ${tab === 'mine' ? 'active' : ''}`}
              onClick={() => setTab('mine')}
            >
              My requests
              <span className="req-pill-badge">{myCount}</span>
            </button>
          </div>

          {/* Row 2: Type filter pills */}
          <div className="requests-types-row">
            {['All', 'Rent', 'Buy', 'Borrow'].map((t) => (
              <button
                key={t}
                className={`req-type-chip ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Feed Content */}
          {loading ? (
            <div className="rd-loading" style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="rd-spinner" style={{ margin: '0 auto 12px' }} />
              <span style={{ color: '#64748b', fontSize: 14 }}>Loading requests…</span>
            </div>
          ) : filteredList.length === 0 ? (
            /* Empty State Matching User Screenshot - finishes flush with right panel */
            <div className="req-empty-card">
              <RequestEmptyIllustration />
              <h3 className="req-empty-title">
                {tab === 'all'
                  ? 'No open requests from other students yet'
                  : "You haven't posted any requests yet"}
              </h3>
              <p className="req-empty-desc">
                {tab === 'all'
                  ? 'When students post item requests they will appear here.'
                  : 'Can’t find what you need? Tell the campus what item you need.'}
              </p>
              <button className="req-empty-btn" onClick={handleFocusPostForm}>
                <PlusCircle size={16} /> Post a request
              </button>
            </div>
          ) : (
            /* Cards List */
            <div className="req-cards-list">
              {filteredList.map((req) => {
                const requesterName =
                  req.requesterId?.profile?.name ||
                  req.requesterId?.name ||
                  req.requesterId?.email?.split('@')[0] ||
                  'Student';
                const initials = requesterName
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const isOwn = req.requesterId?._id?.toString() === userId?.toString();
                const reqType =
                  req.requestType ||
                  (req.description?.includes('Type: Buy')
                    ? 'Buy'
                    : req.description?.includes('Type: Either')
                    ? 'Either'
                    : 'Borrow');

                return (
                  <div key={req._id} className="req-card">
                    <div className="req-card-top">
                      <div className="req-card-left">
                        <div className="req-avatar">{initials}</div>
                        <div>
                          <div className="req-card-title">{req.itemName}</div>
                          <div className="req-card-meta">
                            Asked by {requesterName} · Posted{' '}
                            {new Date(req.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </div>
                        </div>
                      </div>
                      <span className={`req-type-badge req-type-${reqType.toLowerCase()}`}>
                        {reqType}
                      </span>
                    </div>

                    <div className="req-card-details">
                      {req.dueDate && (
                        <span className="req-detail-chip">
                          <Clock size={13} />
                          Needed by {fmt(req.dueDate)}
                        </span>
                      )}
                      {req.budgetPerDay && (
                        <span className="req-detail-chip">
                          <DollarSign size={13} />
                          Up to ₹{req.budgetPerDay}
                        </span>
                      )}
                      {req.description && (
                        <span className="req-detail-chip">
                          <MapPin size={13} />
                          {req.description.replace(/\[Type:.*?\]/g, '').trim() || 'Campus'}
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
                            title="Chat with requester"
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

        {/* Right Column: Inline Post a Request Card */}
        <div className="requests-sidebar-col">
          <div className="req-post-card">
            <h3 className="req-post-card-title">Post a request</h3>
            <p className="req-post-card-sub">
              Can't find it in the marketplace? Tell the campus what item you need.
            </p>

            {/* Quick Suggestions */}
            <div className="req-suggestions-row">
              {['Calculator', 'Lab coat', 'Textbook', 'Adapter'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="req-suggestion-chip"
                  onClick={() => handleSuggestionClick(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <form onSubmit={handlePostSubmit}>
              <div className="req-form-group">
                <label className="req-form-label">WHAT DO YOU NEED</label>
                <input
                  ref={itemInputRef}
                  className="req-form-input"
                  placeholder="e.g. Scientific calculator, Lab coat, Textbook..."
                  value={postForm.itemName}
                  onChange={(e) => setPostForm({ ...postForm, itemName: e.target.value })}
                />
              </div>

              <div className="req-form-grid-2">
                <div className="req-form-group">
                  <label className="req-form-label">BUDGET (₹)</label>
                  <input
                    className="req-form-input"
                    type="number"
                    min="0"
                    placeholder="e.g. Up to 150"
                    value={postForm.budgetPerDay}
                    onChange={(e) => setPostForm({ ...postForm, budgetPerDay: e.target.value })}
                  />
                </div>
                <div className="req-form-group">
                  <label className="req-form-label">NEEDED BY</label>
                  <input
                    className="req-form-input"
                    type="date"
                    min={todayStr}
                    value={postForm.dueDate}
                    onChange={(e) => setPostForm({ ...postForm, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="req-form-group">
                <label className="req-form-label">MEETUP SPOT</label>
                <input
                  className="req-form-input"
                  placeholder="e.g. Library, IT Dept Foyer, Main Gate..."
                  value={postForm.meetupSpot}
                  onChange={(e) => setPostForm({ ...postForm, meetupSpot: e.target.value })}
                />
              </div>

              <div className="req-form-group">
                <label className="req-form-label">TRANSACTION TYPE</label>
                <div className="req-trans-pills">
                  {['Borrow', 'Buy', 'Either'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`req-trans-pill ${postForm.requestType === type ? 'active' : ''}`}
                      onClick={() => setPostForm({ ...postForm, requestType: type })}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {formError && <div className="req-form-error">{formError}</div>}

              <button
                type="submit"
                className="req-submit-btn"
                disabled={submitting}
              >
                <Send size={15} />
                {submitting ? 'Posting...' : 'Post request'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

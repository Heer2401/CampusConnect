import React, { useState, useMemo } from 'react';
import { Search, Eye, Check, X, ShieldAlert, Star, AlertTriangle, MessageSquare, Filter } from 'lucide-react';
import AdminModal from './AdminModal';
import {
  categoryName, formatDate, formatListingPrice,
  listingTypeLabel, listingTypePill, conditionLabel,
} from './adminUtils';

export default function ListingModerationView({ listings = [], categories = [], onApprove, onReject, onFilterQueue }) {
  const [queueFilter, setQueueFilter] = useState('moderation_needed'); // moderation_needed | reported | low_rating | pending_only | all
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectItem, setInspectItem] = useState(null);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  // Category options
  const categoryOptions = useMemo(() => {
    const names = new Set(listings.map(l => categoryName(l.category)));
    (categories || []).forEach(c => names.add(categoryName(c)));
    return [...names].filter(Boolean).sort();
  }, [listings, categories]);

  const term = searchTerm.trim().toLowerCase();

  const filtered = useMemo(() => {
    return listings.filter(l => {
      // 1. Queue type matching
      const hasReports = (l.reports && l.reports.length > 0) || (l.moderationFlags && l.moderationFlags.some(f => f.type === 'reported'));
      const sellerRating = l.seller?.reputation?.rating ?? l.owner?.reputation?.rating ?? 0;
      const isLowRating = sellerRating > 0 && sellerRating < 3.0;
      const isPendingStatus = l.status === 'pending' || l.status === 'pending_approval';

      if (queueFilter === 'reported' && !hasReports) return false;
      if (queueFilter === 'low_rating' && !isLowRating) return false;
      if (queueFilter === 'pending_only' && !isPendingStatus) return false;
      if (queueFilter === 'moderation_needed' && !hasReports && !isLowRating && !isPendingStatus) {
        // In moderation_needed queue, hide listings that are active without any reports or warnings
        return false;
      }

      // 2. Category matching
      const matchCat = categoryFilter === 'all' || categoryName(l.category) === categoryFilter;

      // 3. Search matching
      const matchSearch = !term ||
        (l.title || '').toLowerCase().includes(term) ||
        (l.seller?.profile?.name || l.owner?.profile?.name || '').toLowerCase().includes(term) ||
        (l.seller?.email || l.owner?.email || '').toLowerCase().includes(term);

      return matchCat && matchSearch;
    });
  }, [listings, queueFilter, categoryFilter, term]);

  const closeReject = () => {
    setRejectingItem(null);
    setRejectionReason('');
    setReasonError('');
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setReasonError('A rejection reason is required to notify the student.');
      return;
    }
    onReject(rejectingItem._id, rejectionReason.trim());
    closeReject();
    if (inspectItem?._id === rejectingItem._id) setInspectItem(null);
  };

  const primaryImage = inspectItem?.images?.find(i => i.isPrimary) || inspectItem?.images?.[0];

  const totalReported = listings.filter(l => (l.reports && l.reports.length > 0) || l.moderationFlags?.some(f => f.type === 'reported')).length;
  const totalLowRating = listings.filter(l => {
    const r = l.seller?.reputation?.rating ?? l.owner?.reputation?.rating ?? 0;
    return r > 0 && r < 3.0;
  }).length;

  return (
    <div>
      <div className="adm-section-head">
        <h2>Reported &amp; High-Risk Listing Moderation</h2>
        <p>Marketplace listings go live automatically. Moderate items reported by students or submitted by low-rated sellers.</p>
      </div>

      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search listing by title or student…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search listings"
          />
        </label>
        <div className="adm-filters">
          <label className="adm-filter">
            Moderation Queue
            <select
              className="adm-select"
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value)}
            >
              <option value="moderation_needed">Needs Moderation (Reported / Low Rating)</option>
              <option value="reported">Reported by Students ({totalReported})</option>
              <option value="low_rating">Low Seller Rating &lt; 3.0★ ({totalLowRating})</option>
              <option value="pending_only">Pending Approval</option>
              <option value="all">All Marketplace Listings ({listings.length})</option>
            </select>
          </label>

          <label className="adm-filter">
            Category
            <select className="adm-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="adm-table-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Listing / Details</th>
                <th>Category</th>
                <th>Moderation Reason / Flags</th>
                <th>Price</th>
                <th>Seller Reputation</th>
                <th className="right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="adm-empty">
                      <div className="adm-empty-icon"><Check size={26} color="#10b981" /></div>
                      <b>No listings require moderation in this view</b>
                      <span>
                        {queueFilter === 'moderation_needed'
                          ? 'Zero reported listings or low-rated sellers currently flagged on the campus platform.'
                          : 'No items match your active filters.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const seller = item.seller || item.owner;
                  const rating = seller?.reputation?.rating ?? 0;
                  const reports = item.reports || [];
                  const isReported = reports.length > 0;
                  const isLowRating = rating > 0 && rating < 3.0;

                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="adm-cell-title">{item.title}</div>
                        <div className="adm-cell-sub">
                          {conditionLabel(item.condition)} • {listingTypeLabel(item.listingType)} • {formatDate(item.createdAt)}
                        </div>
                      </td>
                      <td>
                        <span className="adm-pill gray">{categoryName(item.category)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {isReported && (
                            <span className="adm-pill red" title={reports[0]?.description}>
                              <ShieldAlert size={12} /> {reports.length} Student Report(s)
                            </span>
                          )}
                          {isLowRating && (
                            <span className="adm-pill amber">
                              <AlertTriangle size={12} /> Low Rating ({rating.toFixed(1)} ★)
                            </span>
                          )}
                          {item.status === 'pending' || item.status === 'pending_approval' ? (
                            <span className="adm-pill blue">Pending Review</span>
                          ) : null}
                          {!isReported && !isLowRating && item.status === 'active' && (
                            <span className="adm-pill green">Active / Standard</span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="adm-pill red">Rejected</span>
                          )}
                        </div>
                      </td>
                      <td><b>{formatListingPrice(item)}</b></td>
                      <td>
                        <div className="adm-cell-title">{seller?.profile?.name || seller?.email || 'Student'}</div>
                        <div className="adm-cell-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Star size={12} fill={rating >= 3.5 ? '#f59e0b' : '#ef4444'} color={rating >= 3.5 ? '#f59e0b' : '#ef4444'} />
                          <b style={{ color: rating < 3.0 && rating > 0 ? '#ef4444' : 'inherit' }}>
                            {rating > 0 ? `${rating.toFixed(1)}/5.0` : 'No reviews'}
                          </b>
                          <span>({seller?.reputation?.reviewsCount || 0})</span>
                        </div>
                      </td>
                      <td className="right">
                        <div className="adm-actions">
                          <button
                            type="button"
                            className="adm-btn sm secondary"
                            onClick={() => setInspectItem(item)}
                            title="Inspect details & reports"
                          >
                            <Eye size={14} /> Inspect
                          </button>
                          <button
                            type="button"
                            className="adm-btn sm success"
                            onClick={() => onApprove(item._id)}
                            title="Dismiss flags & keep active"
                          >
                            <Check size={14} /> Clear / Keep
                          </button>
                          <button
                            type="button"
                            className="adm-btn sm danger"
                            onClick={() => setRejectingItem(item)}
                            title="Take down listing"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {inspectItem && (
        <AdminModal
          title={`Moderation Details: ${inspectItem.title}`}
          onClose={() => setInspectItem(null)}
          footer={
            <>
              <button type="button" className="adm-btn secondary" onClick={() => setInspectItem(null)}>Close</button>
              <button
                type="button"
                className="adm-btn danger"
                onClick={() => setRejectingItem(inspectItem)}
              >
                <X size={15} /> Reject / Take Down
              </button>
              <button
                type="button"
                className="adm-btn success"
                onClick={() => { onApprove(inspectItem._id); setInspectItem(null); }}
              >
                <Check size={15} /> Clear Flags &amp; Keep Active
              </button>
            </>
          }
        >
          {/* Display Student Reports if any */}
          {inspectItem.reports && inspectItem.reports.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontWeight: 700, marginBottom: '0.5rem' }}>
                <ShieldAlert size={18} /> Student Reports Against This Item ({inspectItem.reports.length})
              </div>
              {inspectItem.reports.map((rep, idx) => (
                <div key={idx} style={{ padding: '0.5rem 0', borderTop: idx > 0 ? '1px dashed #fca5a5' : 'none', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>
                    {rep.title || 'Student Report'} • <span style={{ color: '#64748b', fontWeight: 400 }}>by {rep.reporter} on {formatDate(rep.createdAt)}</span>
                  </div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>
                    "{rep.description}"
                  </div>
                </div>
              ))}
            </div>
          )}

          {(primaryImage?.thumbnailUrl || primaryImage?.url) && (
            <img className="adm-thumb" src={primaryImage.url || primaryImage.thumbnailUrl} alt={inspectItem.title} />
          )}

          <div className="adm-kv">
            <div><div className="adm-kv-k">Category</div><div className="adm-kv-v">{categoryName(inspectItem.category)}</div></div>
            <div><div className="adm-kv-k">Type &amp; Price</div><div className="adm-kv-v">{listingTypeLabel(inspectItem.listingType)} • {formatListingPrice(inspectItem)}</div></div>
            <div><div className="adm-kv-k">Condition</div><div className="adm-kv-v">{conditionLabel(inspectItem.condition)}</div></div>
            <div><div className="adm-kv-k">Current Status</div><div className="adm-kv-v"><code>{inspectItem.status}</code></div></div>
          </div>

          <div className="adm-kv-k">Description</div>
          <p style={{ margin: '0.25rem 0 1.1rem' }}>{inspectItem.description || 'No description provided.'}</p>

          <div className="adm-panel">
            <div className="adm-kv-k">Seller Information &amp; Reputation</div>
            <div className="adm-kv-v" style={{ marginTop: '0.25rem' }}>
              <b>{inspectItem.seller?.profile?.name || inspectItem.owner?.profile?.name || 'Student'}</b> ({inspectItem.seller?.email || inspectItem.owner?.email})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', fontSize: '0.85rem' }}>
              <span>Seller Rating:</span>
              <b>{(inspectItem.seller?.reputation?.rating ?? inspectItem.owner?.reputation?.rating ?? 5).toFixed(1)} / 5.0</b>
              <span>({inspectItem.seller?.reputation?.reviewsCount ?? inspectItem.owner?.reputation?.reviewsCount ?? 0} reviews)</span>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <AdminModal
          title={`Take Down / Reject Listing: ${rejectingItem.title}`}
          onClose={closeReject}
          footer={
            <>
              <button type="button" className="adm-btn secondary" onClick={closeReject}>Cancel</button>
              <button type="button" className="adm-btn danger" onClick={handleConfirmReject}>Confirm Removal</button>
            </>
          }
        >
          <p className="adm-note">
            Specify the moderation rejection reason. The listing will be removed from marketplace discovery and a notification will be sent to the student seller.
          </p>
          <div className="adm-field">
            <label className="adm-label" htmlFor="adm-reject-reason">Reason for removal (required)</label>
            <textarea
              id="adm-reject-reason"
              className={`adm-textarea ${reasonError ? 'invalid' : ''}`}
              placeholder="e.g. Inappropriate item, misleading description reported by buyers, copyright infringement..."
              value={rejectionReason}
              onChange={(e) => { setRejectionReason(e.target.value); if (reasonError) setReasonError(''); }}
              autoFocus
            />
            {reasonError && <div className="adm-error" role="alert">{reasonError}</div>}
          </div>
        </AdminModal>
      )}
    </div>
  );
}

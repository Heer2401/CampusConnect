import React, { useState } from 'react';
import { IconSearch, IconX, IconEye, IconCheck, IconAlertCircle } from '../common/Icons';

export default function ListingModerationView({ listings = [], onApprove, onReject, loading, onRefresh }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectItem, setInspectItem] = useState(null);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const pendingListings = listings.filter(l => l.status === 'pending');

  const filtered = pendingListings.filter(l => {
    const matchCat = categoryFilter === 'all' || l.category === categoryFilter;
    const matchSearch = !searchTerm || 
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.seller?.profile?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      alert('A rejection reason is required to notify the student.');
      return;
    }
    onReject(rejectingItem._id, rejectionReason.trim());
    setRejectingItem(null);
    setRejectionReason('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Listing Approval & Moderation Queue</h1>
          <p className="page-subtitle">Review student listings before publication to enforce university quality and safety policies.</p>
        </div>
      </div>

      <div className="controls-bar">
        <div className="search-box">
          <IconSearch size={14} />
          <input 
            type="text" 
            placeholder="Search listing by title or student..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="stat-label">Category:</label>
          <select 
            className="custom-select" 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Textbooks">Textbooks</option>
            <option value="Electronics">Electronics</option>
            <option value="Notes/PYQ">Notes/PYQ</option>
            <option value="Lab Equipment">Lab Equipment</option>
            <option value="Furniture">Furniture</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item / Listing</th>
              <th>Category</th>
              <th>Type</th>
              <th>Price</th>
              <th>Seller</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: '0.25rem', color: 'var(--text-heading)', fontWeight: 500 }}>No listings pending review</div>
                  <div style={{ fontSize: '0.75rem' }}>All marketplace submissions have been moderated.</div>
                </td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={item._id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{item.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                      {item.condition || 'Used'} • Submitted {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td><span className="pill pill-default">{item.category}</span></td>
                  <td><span className="pill pill-secondary">{item.listingType || 'Sell'}</span></td>
                  <td style={{ fontWeight: 500, fontFamily: 'var(--font-mono)' }}>${item.price || 0}</td>
                  <td>
                    <div style={{ color: 'var(--text-heading)' }}>{item.seller?.profile?.name || item.seller?.email || 'Student'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.seller?.email}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setInspectItem(item)} title="Inspect Details">
                        <IconEye size={12} />
                        <span>Inspect</span>
                      </button>
                      <button className="btn btn-sm btn-success" onClick={() => onApprove(item._id)} title="Approve">
                        <IconCheck size={12} />
                        <span>Approve</span>
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setRejectingItem(item)} title="Reject">
                        <IconX size={12} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inspection Modal */}
      {inspectItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Inspect Listing: {inspectItem.title}</h2>
              <button className="modal-close" onClick={() => setInspectItem(null)}><IconX size={15} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <span className="form-label">Category</span>
                  <div style={{ color: 'var(--text-heading)' }}>{inspectItem.category}</div>
                </div>
                <div>
                  <span className="form-label">Type & Price</span>
                  <div style={{ color: 'var(--text-heading)', fontFamily: 'var(--font-mono)' }}>{inspectItem.listingType} • ${inspectItem.price}</div>
                </div>
                <div>
                  <span className="form-label">Condition</span>
                  <div style={{ color: 'var(--text-heading)' }}>{inspectItem.condition}</div>
                </div>
                <div>
                  <span className="form-label">Seller</span>
                  <div style={{ color: 'var(--text-heading)' }}>{inspectItem.seller?.profile?.name || 'Student'}</div>
                </div>
              </div>

              <span className="form-label">Description</span>
              <p style={{ marginTop: '0.25rem', color: 'var(--text-body)', lineHeight: '1.6' }}>
                {inspectItem.description || 'No description provided.'}
              </p>

              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student Reputation Score</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                  {inspectItem.seller?.reputation?.rating ? `${inspectItem.seller.reputation.rating} / 5.0` : '5.0 / 5.0'} ({inspectItem.seller?.reputation?.reviewsCount || 0} reviews)
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setInspectItem(null)}>Close</button>
              <button className="btn btn-success" onClick={() => { onApprove(inspectItem._id); setInspectItem(null); }}>
                <IconCheck size={13} />
                <span>Approve Listing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Reject Listing: {rejectingItem.title}</h2>
              <button className="modal-close" onClick={() => setRejectingItem(null)}><IconX size={15} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                Specify the moderation reason. This note will be sent directly to the student.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for rejection (Required)</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="e.g. Unclear photos, prohibited item, duplicate study notes..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectingItem(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmReject}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

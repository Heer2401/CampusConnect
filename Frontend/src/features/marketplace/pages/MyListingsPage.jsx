import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listingsApi } from '../api/listingsApi';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../marketplace.css';

export const MyListingsPage = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await listingsApi.getMyListings(params);
      setListings(res.data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, [statusFilter]);

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await listingsApi.deleteListing(deleteTargetId);
      setDeleteTargetId(null);
      fetchMyListings();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete listing');
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="marketplace-page page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1>My Listings</h1>
          <p className="muted">Manage and track your posted campus items across all statuses.</p>
        </div>
        <Link to="/marketplace/create" className="btn btn-primary">
          + Create New Listing
        </Link>
      </div>

      {errorMessage && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 16 }}>
          <p style={{ color: '#b91c1c' }}>{errorMessage}</p>
        </div>
      )}

      {/* Status Filter Chips */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: 'All Statuses', value: '' },
          { label: 'Active', value: 'active' },
          { label: 'Draft', value: 'draft' },
          { label: 'Pending Approval', value: 'pending_approval' },
          { label: 'Sold', value: 'sold' },
          { label: 'Rented', value: 'rented' },
        ].map((item) => (
          <span
            key={item.value}
            className={`chip ${statusFilter === item.value ? 'active' : ''}`}
            onClick={() => setStatusFilter(item.value)}
          >
            {item.label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          Loading your listings...
        </div>
      ) : listings.length === 0 ? (
        <div className="card" style={{ padding: 50, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <h2>No listings found</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            {statusFilter ? `You have no listings with status "${statusFilter}".` : 'You have not created any listings yet.'}
          </p>
          <Link to="/marketplace/create" className="btn btn-primary">
            Create Your First Listing
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Item</th>
                <th>Type</th>
                <th>Price / Rate</th>
                <th>Status</th>
                <th>Views</th>
                <th>Created</th>
                <th style={{ paddingRight: 20, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((item) => {
                const primaryImg = item.images?.find(i => i.isPrimary) || item.images?.[0];
                return (
                  <tr key={item._id}>
                    <td style={{ paddingLeft: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 6,
                            background: '#e2e8f0',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {primaryImg ? (
                            <img
                              src={primaryImg.thumbnailUrl || primaryImg.url}
                              alt={item.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>📷</span>
                          )}
                        </div>
                        <div>
                          <Link
                            to={`/marketplace/${item._id}`}
                            style={{ fontWeight: 600, color: '#1f2937', textDecoration: 'none' }}
                          >
                            {item.title}
                          </Link>
                          <div className="muted" style={{ fontSize: 12 }}>{item.category?.name || 'General'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{item.listingType}</td>
                    <td>
                      {item.listingType === 'sell' && `₹${item.price}`}
                      {item.listingType === 'rent' && `₹${item.rentalRate}/${item.rentalPeriod}`}
                      {item.listingType === 'exchange' && 'Trade'}
                      {item.listingType === 'giveaway' && 'Free'}
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>👁️ {item.viewCount || 0}</td>
                    <td className="muted">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td style={{ paddingRight: 20, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <Link to={`/marketplace/edit/${item._id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => setDeleteTargetId(item._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? Active transactions cannot be deleted."
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

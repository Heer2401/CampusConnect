import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listingsApi } from '../api/listingsApi';
import { useAuth } from '../hooks/useAuth';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { WishlistButton } from '../../search_communication/components/WishlistButton';
import { chatApi } from '../../search_communication/api/chatApi';

export const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listingsApi.getListingById(id);
      setListing(data);
    } catch (err) {
      setError(err.message || 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await listingsApi.deleteListing(id);
      setShowDeleteModal(false);
      navigate('/browse');
    } catch (err) {
      setActionNotice(err.message || 'Failed to delete listing');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleContactSeller = async () => {
    try {
      if (!user) {
        setActionNotice('Please log in to chat with the seller');
        return;
      }
      if (isOwner) {
        setActionNotice('You are the owner of this listing');
        return;
      }
      const res = await chatApi.createOrGetThread(listing._id, listing.owner?._id);
      if (res.data?._id) {
        navigate(`/chat?thread=${res.data._id}`);
      }
    } catch (err) {
      setActionNotice(err.message || 'Could not initiate chat with seller');
    }
  };

  const handleActionClick = (actionName) => {
    setActionNotice(`"${actionName}" flow belongs to teammate module (Charmi / Heer / Dhrumil). Action hook ready.`);
    setTimeout(() => setActionNotice(''), 4000);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          Loading listing details...
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#dc2626', marginBottom: 16 }}>{error || 'Listing not found'}</p>
          <Link to="/browse" className="btn btn-secondary">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && listing.owner && (user._id === listing.owner._id || user.id === listing.owner._id);
  const images = listing.images || [];
  const activeImage = images[selectedImageIndex] || images[0];

  const renderActionButtons = () => {
    switch (listing.listingType) {
      case 'sell':
        return (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px 20px', fontSize: 16 }}
            onClick={() => handleActionClick('Buy Item')}
          >
            Buy Item (₹{listing.price})
          </button>
        );
      case 'rent':
        return (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px 20px', fontSize: 16, background: '#166534' }}
            onClick={() => handleActionClick('Rent Item')}
          >
            Request Rental (₹{listing.rentalRate}/{listing.rentalPeriod})
          </button>
        );
      case 'exchange':
        return (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px 20px', fontSize: 16, background: '#6b21a8' }}
            onClick={() => handleActionClick('Offer Exchange')}
          >
            Offer Exchange
          </button>
        );
      case 'giveaway':
        return (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px 20px', fontSize: 16, background: '#92400e' }}
            onClick={() => handleActionClick('Claim Free Item')}
          >
            Claim Free Item
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page">
      {/* Notice Banner */}
      {actionNotice && (
        <div className="toast">
          ℹ️ {actionNotice}
        </div>
      )}

      {/* Non-Active Status Banner */}
      {listing.status !== 'active' && (
        <div
          className="card"
          style={{
            background: '#fef3c7',
            marginBottom: 20,
            borderLeft: '4px solid #f59e0b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <b>Status: <StatusBadge status={listing.status} /></b>
            <p className="muted" style={{ marginTop: 4 }}>
              This listing is currently in <b>{listing.status}</b> state and is not visible to the public marketplace.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 28 }}>
        {/* Left: Image Gallery */}
        <div>
          <div
            className="listing-img"
            style={{ height: 380, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}
          >
            {activeImage ? (
              <img
                src={activeImage.url}
                alt={listing.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: 48 }}>📷</span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12, overflowX: 'auto', paddingBottom: 6 }}>
              {images.map((img, idx) => (
                <div
                  key={img._id || img.key}
                  onClick={() => setSelectedImageIndex(idx)}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: selectedImageIndex === idx ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={img.thumbnailUrl || img.url}
                    alt={`Thumbnail ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details & Actions */}
        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <span className="pill pill-blue" style={{ marginBottom: 8 }}>
                {listing.category?.name || 'General'}
              </span>
              <h1 style={{ fontSize: 24, marginTop: 6 }}>{listing.title}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <WishlistButton listingId={listing._id} showLabel={true} />
              <StatusBadge status={listing.status} />
            </div>
          </div>

          {/* Pricing Section */}
          <div style={{ marginTop: 16, padding: '14px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
            {listing.listingType === 'sell' && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#1d4ed8' }}>₹{listing.price}</span>
                <span className="muted">Fixed Price</span>
              </div>
            )}
            {listing.listingType === 'rent' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: '#166534' }}>
                    ₹{listing.rentalRate}
                  </span>
                  <span className="muted">per {listing.rentalPeriod}</span>
                </div>
                {listing.deposit && (
                  <p className="muted" style={{ marginTop: 4 }}>
                    Security Deposit: <b>₹{listing.deposit}</b> (Refundable)
                  </p>
                )}
              </div>
            )}
            {listing.listingType === 'exchange' && (
              <div>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#6b21a8' }}>Trade / Exchange</span>
                <p style={{ marginTop: 6, fontSize: 14 }}>
                  <b>Owner wants:</b> {listing.exchangeFor}
                </p>
              </div>
            )}
            {listing.listingType === 'giveaway' && (
              <div>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#92400e' }}>Free Giveaway</span>
                <p className="muted" style={{ marginTop: 4 }}>₹0 · Available for campus pickup</p>
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <span className="muted" style={{ fontSize: 12 }}>Condition</span>
              <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                {listing.condition?.replace('_', ' ') || 'Good'}
              </p>
            </div>
            <div>
              <span className="muted" style={{ fontSize: 12 }}>Quantity</span>
              <p style={{ fontWeight: 600 }}>{listing.quantity || 1}</p>
            </div>
            {listing.pickupLocation && (
              <div style={{ gridColumn: 'span 2' }}>
                <span className="muted" style={{ fontSize: 12 }}>Pickup Location</span>
                <p style={{ fontWeight: 600 }}>📍 {listing.pickupLocation}</p>
              </div>
            )}
            <div>
              <span className="muted" style={{ fontSize: 12 }}>Views</span>
              <p style={{ fontWeight: 600 }}>👁️ {listing.viewCount || 0}</p>
            </div>
            <div>
              <span className="muted" style={{ fontSize: 12 }}>Posted</span>
              <p style={{ fontWeight: 600 }}>
                {new Date(listing.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: 20 }}>
            <span className="muted" style={{ fontSize: 12 }}>Description</span>
            <p style={{ marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {listing.description}
            </p>
          </div>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {listing.tags.map(t => (
                <span key={t} className="chip-tag">#{t}</span>
              ))}
            </div>
          )}

          {/* Seller Information (Sanitized: only name and avatar) */}
          <div
            style={{
              marginTop: 24,
              padding: 14,
              background: '#f8fafc',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div className="avatar">
              {listing.owner?.avatar ? (
                <img src={listing.owner.avatar} alt={listing.owner.name} style={{ width: '100%', borderRadius: '50%' }} />
              ) : (
                listing.owner?.name?.charAt(0) || 'U'
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{listing.owner?.name || 'Campus Student'}</div>
              <div className="muted" style={{ fontSize: 12 }}>Verified Student</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', gap: 10 }}>
            {isOwner ? (
              <>
                <Link
                  to={`/listings/${listing._id}/edit`}
                  className="btn btn-secondary"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Edit Listing
                </Link>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                {renderActionButtons()}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleContactSeller}
                >
                  Contact Seller
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? It will be removed from the marketplace."
        confirmText={isDeleting ? 'Deleting...' : 'Delete Listing'}
        isDanger={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

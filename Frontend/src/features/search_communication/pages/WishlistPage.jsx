import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wishlistApi } from '../api/wishlistApi';
import { useWishlist } from '../context/WishlistContext';
import { Heart, X, Image as ImageIcon, ArrowLeft } from 'lucide-react';

export const WishlistPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toggleWishlist, refreshWishlist } = useWishlist();

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await wishlistApi.getWishlist();
      setItems(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (e, listingId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await toggleWishlist(listingId);
      setItems(prev => prev.filter(i => (i.listing?._id || i._id) !== listingId));
      refreshWishlist();
    } catch (err) {
      alert('Could not remove item from wishlist: ' + err.message);
    }
  };

  const formatCondition = (condition) => {
    if (!condition) return 'Good';
    const c = condition.toLowerCase().trim();
    if (c === 'new') return 'New';
    if (c === 'like_new' || c === 'like new') return 'Like new';
    if (c === 'good') return 'Good';
    if (c === 'fair') return 'Fair condition';
    if (c === 'poor') return 'Poor condition';
    return condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderPrice = (listing) => {
    if (listing.listingType === 'rent') {
      const rate = listing.rentalRate || listing.price || 0;
      return `₹${Number(rate).toLocaleString('en-IN')}/${listing.rentalPeriod || 'day'}`;
    }
    if (listing.listingType === 'giveaway') {
      return 'Free';
    }
    if (listing.listingType === 'exchange') {
      return 'Swap';
    }
    return `₹${Number(listing.price || 0).toLocaleString('en-IN')}`;
  };

  const renderTypeBadge = (listing) => {
    const type = listing.listingType || 'sell';
    if (type === 'rent') {
      return <span className="wishlist-pill wishlist-pill-rent">Rent</span>;
    }
    if (type === 'giveaway') {
      return <span className="wishlist-pill wishlist-pill-free">Free</span>;
    }
    if (type === 'exchange') {
      return <span className="wishlist-pill wishlist-pill-swap">Swap</span>;
    }
    return <span className="wishlist-pill wishlist-pill-sell">Sell</span>;
  };

  if (loading) {
    return (
      <div className="wishlist-page-wrapper">
        <div className="wishlist-page-container">
          <div className="wishlist-header">
            <div>
              <h1 className="wishlist-title">My Wishlist</h1>
              <p className="wishlist-subtitle">Saved items across campus</p>
            </div>
          </div>
          <div className="wishlist-grid">
            {[1, 2, 3].map(n => (
              <div key={n} className="wishlist-card" style={{ height: 320 }}>
                <div className="wishlist-skeleton-img" />
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="wishlist-skeleton-line" style={{ width: '70%', height: 16 }} />
                  <div className="wishlist-skeleton-line" style={{ width: '45%', height: 12 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                    <div className="wishlist-skeleton-line" style={{ width: '30%', height: 18 }} />
                    <div className="wishlist-skeleton-line" style={{ width: '20%', height: 18, borderRadius: 12 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wishlist-page-wrapper">
        <div className="wishlist-page-container">
          <div className="wishlist-empty-state">
            <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
            <button type="button" className="btn btn-secondary" onClick={fetchWishlist}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page-wrapper">
      <div className="wishlist-page-container">
        <div className="wishlist-header">
          <div>
            <h1 className="wishlist-title">My Wishlist ({items.length})</h1>
            <p className="wishlist-subtitle">Saved items across campus</p>
          </div>
          <Link to="/marketplace" className="wishlist-browse-btn">
            <ArrowLeft size={15} /> Browse more listings
          </Link>
        </div>

      {items.length === 0 ? (
        <div className="wishlist-empty-state">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Heart size={44} color="#ef4444" fill="#fee2e2" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
            Your Wishlist is Empty
          </h2>
          <p style={{ maxWidth: 440, margin: '0 auto 20px', color: '#64748b', fontSize: 14 }}>
            Find textbooks, lab gear, calculators or furniture in the campus marketplace and click the heart icon to save them here!
          </p>
          <Link to="/marketplace" className="wishlist-browse-btn" style={{ padding: '10px 20px', fontSize: 14 }}>
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map(entry => {
            const listing = entry.listing;
            if (!listing) {
              return (
                <div key={entry._id} className="wishlist-card" style={{ padding: 20, background: '#f8fafc', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 12px 0' }}>This listing is no longer available.</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={(e) => handleRemove(e, entry.wishlistId)}
                  >
                    Remove from Wishlist
                  </button>
                </div>
              );
            }

            const primaryImg = listing.images?.find(i => i.isPrimary) || listing.images?.[0];
            const imgUrl = primaryImg?.thumbnailUrl || primaryImg?.url;
            const isUnavailable = entry.isUnavailable;
            const categoryName = listing.category?.name || (typeof listing.category === 'string' ? listing.category : 'General');

            return (
              <div
                key={entry._id}
                className="wishlist-card"
                style={{ opacity: isUnavailable ? 0.65 : 1 }}
              >
                {/* Floating remove button */}
                <button
                  type="button"
                  className="wishlist-remove-btn"
                  onClick={(e) => handleRemove(e, listing._id)}
                  title="Remove from wishlist"
                  aria-label="Remove item from wishlist"
                >
                  <X size={15} color="#ef4444" strokeWidth={2.5} />
                </button>

                <Link
                  to={`/marketplace/${listing._id}`}
                  className="wishlist-card-link"
                >
                  <div className="wishlist-img-wrapper">
                    {imgUrl ? (
                      <img src={imgUrl} alt={listing.title} className="wishlist-img" loading="lazy" />
                    ) : (
                      <div className="wishlist-img-placeholder">
                        <ImageIcon size={28} />
                        <span>No Photo</span>
                      </div>
                    )}
                    {isUnavailable && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          left: 10,
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        Unavailable
                      </span>
                    )}
                  </div>

                  <div className="wishlist-card-body">
                    <h2 className="wishlist-item-title" title={listing.title}>
                      {listing.title}
                    </h2>

                    <div className="wishlist-item-meta" title={`${categoryName} · ${formatCondition(listing.condition)}`}>
                      {categoryName} · {formatCondition(listing.condition)}
                    </div>

                    <div className="wishlist-card-footer">
                      <div className="wishlist-price">
                        {renderPrice(listing)}
                      </div>
                      {renderTypeBadge(listing)}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
export default WishlistPage;

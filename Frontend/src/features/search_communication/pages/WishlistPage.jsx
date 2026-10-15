import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wishlistApi } from '../api/wishlistApi';
import { useWishlist } from '../context/WishlistContext';

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

  const handleRemove = async (listingId) => {
    try {
      await toggleWishlist(listingId);
      setItems(prev => prev.filter(i => (i.listing?._id || i._id) !== listingId));
      refreshWishlist();
    } catch (err) {
      alert('Could not remove item from wishlist: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24 }}>My Wishlist</h1>
          <p className="muted">Saved listings you're interested in</p>
        </div>
        <div className="grid3">
          {[1, 2, 3].map(n => (
            <div key={n} className="card" style={{ height: 260, opacity: 0.6 }}>
              <div className="listing-img" style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div>
              <div style={{ height: 16, background: '#e2e8f0', marginTop: 12, borderRadius: 4 }} />
              <div style={{ height: 12, background: '#e2e8f0', marginTop: 8, width: '50%', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={fetchWishlist}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>My Wishlist ({items.length})</h1>
          <p className="muted" style={{ marginTop: 4 }}>Saved items across campus</p>
        </div>
        <Link to="/browse" className="btn btn-secondary">
          ← Browse More Listings
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
          <h2>Your Wishlist is Empty</h2>
          <p className="muted" style={{ maxWidth: 440, margin: '8px auto 20px' }}>
            Find textbooks, lab gear, calculators or furniture in the campus marketplace and click the heart icon to save them here!
          </p>
          <Link to="/browse" className="btn btn-primary">
            Explore Campus Listings
          </Link>
        </div>
      ) : (
        <div className="grid3">
          {items.map(entry => {
            const listing = entry.listing;
            if (!listing) {
              return (
                <div key={entry._id} className="card" style={{ padding: 18, background: '#f8fafc' }}>
                  <p className="muted">This listing is no longer available.</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 10, fontSize: 12 }}
                    onClick={() => handleRemove(entry.wishlistId)}
                  >
                    Remove from Wishlist
                  </button>
                </div>
              );
            }

            const primaryImg = listing.images?.find(i => i.isPrimary) || listing.images?.[0];
            const imgUrl = primaryImg?.thumbnailUrl || primaryImg?.url;
            const isUnavailable = entry.isUnavailable;

            return (
              <div
                key={entry._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: isUnavailable ? 0.65 : 1
                }}
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(listing._id)}
                  title="Remove from wishlist"
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    cursor: 'pointer',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444'
                  }}
                >
                  ✕
                </button>

                <Link
                  to={`/listings/${listing._id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <div className="listing-img" style={{ position: 'relative' }}>
                    {imgUrl ? (
                      <img src={imgUrl} alt={listing.title} loading="lazy" />
                    ) : (
                      <span>📷 Photo</span>
                    )}
                    {isUnavailable && (
                      <span
                        className="pill pill-gray"
                        style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                      >
                        Unavailable
                      </span>
                    )}
                  </div>

                  <h2 style={{ marginTop: 12, fontSize: 15, lineHeight: 1.3, flex: 1 }}>
                    {listing.title}
                  </h2>

                  <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                    {listing.category?.name || 'General'} · Condition: {listing.condition || 'Good'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    {listing.listingType === 'sell' && <b>₹{listing.price}</b>}
                    {listing.listingType === 'rent' && <b>₹{listing.rentalRate}/{listing.rentalPeriod}</b>}
                    {listing.listingType === 'giveaway' && <b style={{ color: '#166534' }}>Free</b>}
                    {listing.listingType === 'exchange' && <b>Trade</b>}

                    <span className={`pill pill-${listing.listingType === 'rent' ? 'green' : listing.listingType === 'giveaway' ? 'yellow' : 'blue'}`}>
                      {listing.listingType}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

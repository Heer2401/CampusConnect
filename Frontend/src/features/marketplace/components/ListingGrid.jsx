import React from 'react';
import { Package } from 'lucide-react';
import { ListingCard } from './ListingCard';

export const ListingGrid = ({ listings = [], loading = false, error = null, onRetry, gridClass = 'grid3' }) => {
  if (loading) {
    return (
      <div className={gridClass}>
        {[1, 2, 3, 4, 5, 6].map(n => (
          <div key={n} className="card" style={{ height: 240, opacity: 0.6 }}>
            <div className="listing-img" style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div>
            <div style={{ height: 16, background: '#e2e8f0', marginTop: 12, borderRadius: 4 }} />
            <div style={{ height: 12, background: '#e2e8f0', marginTop: 8, width: '60%', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Package size={36} color="#94a3b8" />
        </div>
        <h2>No listings found</h2>
        <p className="muted">Try adjusting your filters or search keywords, or post a new listing!</p>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {listings.map(item => (
        <ListingCard key={item._id} listing={item} />
      ))}
    </div>
  );
};

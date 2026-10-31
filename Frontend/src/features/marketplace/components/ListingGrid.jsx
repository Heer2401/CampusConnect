import React from 'react';
import { Package } from 'lucide-react';
import { ListingCard } from './ListingCard';

export const ListingGrid = ({
  listings = [],
  loading = false,
  error = null,
  onRetry,
  gridClass = 'grid4',
}) => {
  const isGrid3 = gridClass === 'grid3';
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isGrid3
      ? 'repeat(auto-fill, minmax(280px, 1fr))'
      : 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '22px',
    alignItems: 'stretch',
  };

  if (loading) {
    return (
      <div className={gridClass} style={gridStyle}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div key={n} className="card" style={{ height: 320, opacity: 0.6, padding: 0, borderRadius: 14 }}>
            <div className="listing-img" style={{ height: 180, animation: 'pulse 1.5s infinite', background: '#f1f5f9' }} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ height: 16, background: '#e2e8f0', borderRadius: 4 }} />
              <div style={{ height: 14, background: '#e2e8f0', marginTop: 10, width: '40%', borderRadius: 4 }} />
              <div style={{ height: 12, background: '#e2e8f0', marginTop: 12, width: '70%', borderRadius: 4 }} />
            </div>
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
    <div className={gridClass} style={gridStyle}>
      {listings.map((item) => (
        <ListingCard key={item._id} listing={item} />
      ))}
    </div>
  );
};

export default ListingGrid;

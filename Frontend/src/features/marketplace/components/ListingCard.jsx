import React from 'react';
import { Link } from 'react-router-dom';
import { WishlistButton } from '../../search_communication/components/WishlistButton';

const conditionMap = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good condition',
  fair: 'Fair condition',
  poor: 'Poor condition',
};

export const ListingCard = ({ listing }) => {
  const { _id, title, listingType, price, rentalRate, rentalPeriod, condition, category, images } = listing;

  const primaryImage = images?.find(img => img.isPrimary) || images?.[0];
  const imageUrl = primaryImage?.thumbnailUrl || primaryImage?.url;

  const renderPriceAndBadge = () => {
    switch (listingType) {
      case 'sell':
        return (
          <>
            <b>₹{price}</b>
            <span className="pill pill-blue">Sell</span>
          </>
        );
      case 'rent':
        return (
          <>
            <b>₹{rentalRate}/{rentalPeriod || 'week'}</b>
            <span className="pill pill-green">Rent</span>
          </>
        );
      case 'giveaway':
        return (
          <>
            <b style={{ color: '#166534' }}>Free</b>
            <span className="pill pill-yellow">Giveaway</span>
          </>
        );
      case 'exchange':
        return (
          <>
            <b>Exchange</b>
            <span className="pill pill-purple">Exchange</span>
          </>
        );
      default:
        return (
          <>
            <b>₹{price || 0}</b>
            <span className="pill pill-blue">{listingType}</span>
          </>
        );
    }
  };

  const categoryName = category?.name || 'General';
  const conditionLabel = conditionMap[condition] || condition || 'Good';

  return (
    <Link to={`/marketplace/${_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}>
        <div className="listing-img" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
            <WishlistButton listingId={_id} />
          </div>
          {imageUrl ? (
            <img src={imageUrl} alt={title} loading="lazy" />
          ) : (
            <span>📷 Photo</span>
          )}
        </div>
        <h2 style={{ marginTop: 12, fontSize: 15, lineHeight: 1.3, flex: 1 }}>{title}</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          {conditionLabel} · {categoryName}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          {renderPriceAndBadge()}
        </div>
      </div>
    </Link>
  );
};

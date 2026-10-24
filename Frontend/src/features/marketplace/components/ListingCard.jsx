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

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const ListingCard = ({ listing }) => {
  const {
    _id,
    title,
    listingType,
    price,
    rentalRate,
    rentalPeriod,
    condition,
    category,
    images,
    owner,
    createdAt,
  } = listing;

  const primaryImage = images?.find((img) => img.isPrimary) || images?.[0];
  const imageUrl = primaryImage?.thumbnailUrl || primaryImage?.url;

  const rating = owner?.reputation?.rating;
  const reviewsCount = owner?.reputation?.reviewsCount;
  const hasRating = typeof rating === 'number' && rating > 0;

  const renderPriceAndBadge = () => {
    switch (listingType) {
      case 'sell':
        return (
          <>
            <div className="listing-card-price">
              <b>₹{price ?? 0}</b>
            </div>
            <span className="pill pill-blue">Sell</span>
          </>
        );
      case 'rent': {
        const rate = rentalRate || price || 0;
        const period = rentalPeriod || 'week';
        return (
          <>
            <div className="listing-card-price">
              <b>₹{rate}</b>
              <span className="listing-card-period">/{period}</span>
            </div>
            <span className="pill pill-green">Rent</span>
          </>
        );
      }
      case 'giveaway':
        return (
          <>
            <div className="listing-card-price" style={{ color: '#166534' }}>
              <b>Free</b>
            </div>
            <span className="pill pill-yellow">Giveaway</span>
          </>
        );
      case 'exchange':
        return (
          <>
            <div className="listing-card-price" style={{ color: '#6b21a8' }}>
              <b>Exchange</b>
            </div>
            <span className="pill pill-purple">Exchange</span>
          </>
        );
      default:
        return (
          <>
            <div className="listing-card-price">
              <b>₹{price || 0}</b>
            </div>
            <span className="pill pill-blue">{listingType}</span>
          </>
        );
    }
  };

  const categoryName = category?.name || 'General';
  const conditionLabel = conditionMap[condition] || condition || 'Good';
  const timeAgo = formatTimeAgo(createdAt);

  return (
    <Link to={`/marketplace/${_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="card listing-item-card"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
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

        <h2
          style={{
            marginTop: 12,
            fontSize: 15,
            lineHeight: 1.35,
            fontWeight: 600,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.7em',
          }}
          title={title}
        >
          {title}
        </h2>

        <p className="muted" style={{ marginTop: 2, fontSize: 12 }}>
          {conditionLabel} · {categoryName}
        </p>

        {/* Informative metadata: Rating & Listing Age */}
        <div className="listing-card-meta">
          {hasRating ? (
            <span className="listing-card-rating" title={`Seller Rating: ${rating.toFixed(1)}/5`}>
              <span className="rating-star">★</span> {rating.toFixed(1)}
              {reviewsCount > 0 && <span className="rating-count">({reviewsCount})</span>}
            </span>
          ) : owner?.profile?.name ? (
            <span className="listing-card-seller">
              By {owner.profile.name.split(' ')[0]}
            </span>
          ) : (
            <span />
          )}

          {timeAgo && (
            <span className="listing-card-age" title={new Date(createdAt).toLocaleString()}>
              Posted {timeAgo}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          {renderPriceAndBadge()}
        </div>
      </div>
    </Link>
  );
};

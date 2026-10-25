import React from 'react';
import { Link } from 'react-router-dom';
import { WishlistButton } from '../../search_communication/components/WishlistButton';
import { Image as ImageIcon, Star } from 'lucide-react';

const conditionMap = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good condition',
  fair: 'Fair condition',
  poor: 'Poor condition',
};

function formatTimeAgo(dateString) {
  if (!dateString) return '2d ago';
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

const AVATAR_COLORS = ['#818cf8', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#38bdf8'];

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

  const rawRating = owner?.reputation?.rating ?? listing.rating;
  const rating = typeof rawRating === 'number' && rawRating > 0 ? rawRating : 4.5;
  const reviewsCount = owner?.reputation?.reviewsCount ?? listing.reviewsCount ?? 8;

  const sellerName = owner?.profile?.name || owner?.name || 'Dev';
  const sellerInitial = (sellerName[0] || 'D').toUpperCase();
  const avatarColor = AVATAR_COLORS[(sellerName.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  const categoryName = category?.name || 'General';
  const conditionLabel = conditionMap[condition] || condition || 'Good';
  const timeAgo = formatTimeAgo(createdAt);

  const renderPriceAndBadge = () => {
    switch (listingType) {
      case 'sell':
        return (
          <>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{Number(price ?? 0).toLocaleString('en-IN')}
            </div>
            <span
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '3px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Sell
            </span>
          </>
        );
      case 'rent': {
        const rate = rentalRate || price || 0;
        const period = rentalPeriod || 'week';
        return (
          <>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{Number(rate).toLocaleString('en-IN')}
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
                /{period}
              </span>
            </div>
            <span
              style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '3px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Rent
            </span>
          </>
        );
      }
      case 'giveaway':
        return (
          <>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534' }}>
              Free
            </div>
            <span
              style={{
                background: '#fef3c7',
                color: '#92400e',
                padding: '3px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Giveaway
            </span>
          </>
        );
      case 'exchange':
        return (
          <>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#6b21a8' }}>
              Swap
            </div>
            <span
              style={{
                background: '#f3e8ff',
                color: '#7c3aed',
                padding: '3px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Exchange
            </span>
          </>
        );
      default:
        return (
          <>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{Number(price || 0).toLocaleString('en-IN')}
            </div>
            <span
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '3px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {listingType}
            </span>
          </>
        );
    }
  };

  return (
    <Link to={`/marketplace/${_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="card listing-item-card"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          overflow: 'hidden',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          boxSizing: 'border-box',
        }}
      >
        {/* Card Image with Wishlist Button */}
        <div
          style={{
            height: '175px',
            background: '#f8fafc',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
            <WishlistButton listingId={_id} />
          </div>

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: '0.8rem' }}>
              <ImageIcon size={20} />
              <span>Photo</span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h2
            style={{
              margin: '0 0 4px 0',
              fontSize: '0.95rem',
              lineHeight: 1.35,
              fontWeight: 700,
              color: '#0f172a',
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

          <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#64748b' }}>
            {conditionLabel} · {categoryName}
          </p>

          {/* Rating Pill Badge */}
          <div style={{ marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: '#fef3c7',
                color: '#b45309',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <Star size={11} fill="#f59e0b" color="#f59e0b" />
              <span>{rating.toFixed(1)}</span>
              <span style={{ fontWeight: 500, color: '#92400e' }}>({reviewsCount})</span>
            </span>
          </div>

          {/* Seller Avatar & Posted Time Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#64748b',
              marginBottom: '12px',
              marginTop: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: avatarColor,
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {sellerInitial}
              </span>
              <span style={{ fontWeight: 500, color: '#334155' }}>{sellerName.split(' ')[0]}</span>
            </div>

            <span>Posted {timeAgo}</span>
          </div>

          {/* Price & Action Badge Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #f8fafc',
              paddingTop: '10px',
            }}
          >
            {renderPriceAndBadge()}
          </div>
        </div>
      </div>
    </Link>
  );
};

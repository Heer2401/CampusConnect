import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { WishlistButton } from '../../search_communication/components/WishlistButton';
import {
  ShoppingBag,
  Calendar,
  Repeat,
  Gift,
  Star,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

const conditionMap = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
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
  const [imgError, setImgError] = useState(false);

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

  // Rating & Reviews
  const rawRating = owner?.reputation?.rating ?? listing.rating;
  const reviewsCount = owner?.reputation?.reviewsCount ?? listing.reviewsCount ?? 0;
  const isNewSeller = !rawRating || reviewsCount === 0;
  const rating = typeof rawRating === 'number' && rawRating > 0 ? rawRating : 4.8;

  // Seller Info
  const sellerName = owner?.profile?.name || owner?.name || 'Aarav';
  const sellerFirstName = sellerName.trim().split(' ')[0];
  const sellerInitial = (sellerFirstName[0] || 'A').toUpperCase();
  const sellerAvatar = owner?.avatar || owner?.profile?.avatar;
  const avatarColor = AVATAR_COLORS[(sellerName.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  const categoryName = category?.name || 'General';
  const conditionLabel = conditionMap[condition] || 'Good';
  const timeAgo = formatTimeAgo(createdAt);

  // Render Top-Left Overlay Badge matching Image 2
  const renderTypeBadge = () => {
    switch (listingType) {
      case 'rent':
        return (
          <span className="card-type-overlay-badge badge-type-rent">
            <Calendar size={12} strokeWidth={2.5} />
            <span>Rent</span>
          </span>
        );
      case 'exchange':
        return (
          <span className="card-type-overlay-badge badge-type-swap">
            <Repeat size={12} strokeWidth={2.5} />
            <span>Swap</span>
          </span>
        );
      case 'giveaway':
        return (
          <span className="card-type-overlay-badge badge-type-free">
            <Gift size={12} strokeWidth={2.5} />
            <span>Free</span>
          </span>
        );
      case 'sell':
      default:
        return (
          <span className="card-type-overlay-badge badge-type-buy">
            <ShoppingBag size={12} strokeWidth={2.5} />
            <span>Buy</span>
          </span>
        );
    }
  };

  // Render Price matching Image 2
  const renderPrice = () => {
    switch (listingType) {
      case 'rent': {
        const rate = rentalRate || price || 250;
        const period = rentalPeriod || 'day';
        return (
          <div className="card-item-price price-rent">
            ₹{Number(rate).toLocaleString('en-IN')}/{period}
          </div>
        );
      }
      case 'exchange':
        return <div className="card-item-price price-swap">Swap</div>;
      case 'giveaway':
        return <div className="card-item-price price-free">Free</div>;
      case 'sell':
      default:
        return (
          <div className="card-item-price price-sell">
            ₹{Number(price ?? 350).toLocaleString('en-IN')}
          </div>
        );
    }
  };

  return (
    <Link to={`/marketplace/${_id}`} className="marketplace-item-card-link">
      <div className="marketplace-item-card">
        {/* ── Top Media Container ────────────────────────────────────────── */}
        <div className="card-media-wrapper">
          {/* Top-Left Category Badge */}
          {renderTypeBadge()}

          {/* Top-Right Wishlist Button */}
          <div className="card-wishlist-overlay">
            <WishlistButton listingId={_id} size={15} />
          </div>

          {/* Listing Image with error fallback */}
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className="card-media-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="card-media-placeholder">
              <ImageIcon size={26} className="placeholder-icon" />
              <span className="placeholder-text">Campus Item</span>
            </div>
          )}
        </div>

        {/* ── Card Body Content (Constant Heights & Spacing) ──────────────── */}
        <div className="card-body-content">
          {/* Title - Fixed 2-line clamp */}
          <h2 className="card-item-title" title={title}>
            {title}
          </h2>

          {/* Price */}
          {renderPrice()}

          {/* Tags Row: Condition Pill + Category Pill */}
          <div className="card-tags-row">
            <span className="card-condition-pill">{conditionLabel}</span>
            <span className="card-category-pill" title={categoryName}>
              {categoryName}
            </span>
          </div>

          {/* Bottom Seller Row: Avatar + Name + Rating/New seller + Time ago */}
          <div className="card-seller-row">
            <div className="card-seller-left">
              {sellerAvatar ? (
                <img src={sellerAvatar} alt={sellerFirstName} className="card-seller-avatar" />
              ) : (
                <span className="card-seller-avatar" style={{ background: avatarColor }}>
                  {sellerInitial}
                </span>
              )}
              <span className="card-seller-name">{sellerFirstName}</span>
            </div>

            {/* Seller Reputation or New seller badge */}
            {isNewSeller ? (
              <span className="card-seller-new">
                <CheckCircle2 size={11} fill="#0284c7" color="#ffffff" />
                <span>New seller</span>
              </span>
            ) : (
              <span className="card-seller-rating">
                <Star size={12} fill="#eab308" color="#eab308" />
                <span>{rating.toFixed(1)}</span>
              </span>
            )}

            {/* Posted Time */}
            <span className="card-posted-time">{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;

import React, { useState } from 'react';
import { useWishlist } from '../context/WishlistContext';

export const WishlistButton = ({ listingId, size = 20, className = '', showLabel = false }) => {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [isUpdating, setIsUpdating] = useState(false);
  const saved = isWishlisted(listingId);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      await toggleWishlist(listingId);
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      type="button"
      className={`wishlist-heart-btn ${className}`}
      onClick={handleClick}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      title={saved ? 'Saved in Wishlist' : 'Add to Wishlist'}
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '50%',
        width: showLabel ? 'auto' : 34,
        height: 34,
        padding: showLabel ? '6px 14px' : 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        transition: 'transform 0.15s ease, background 0.15s ease',
        transform: isUpdating ? 'scale(1.15)' : 'scale(1)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={saved ? '#ef4444' : 'none'}
        stroke={saved ? '#ef4444' : '#64748b'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {showLabel && (
        <span style={{ fontSize: 13, fontWeight: 600, color: saved ? '#ef4444' : '#475569' }}>
          {saved ? 'Saved' : 'Wishlist'}
        </span>
      )}
    </button>
  );
};

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WishlistButton } from '../components/WishlistButton';
import { WishlistProvider } from '../context/WishlistContext';

vi.mock('../api/wishlistApi', () => ({
  wishlistApi: {
    getWishlistIds: vi.fn().mockResolvedValue({ success: true, data: ['item-123'] }),
    addToWishlist: vi.fn().mockResolvedValue({ success: true }),
    removeFromWishlist: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('WishlistButton Component', () => {
  it('renders wishlist button with accessible label', () => {
    render(
      <WishlistProvider>
        <WishlistButton listingId="item-456" showLabel={true} />
      </WishlistProvider>
    );

    const btn = screen.getByRole('button', { name: /Add to wishlist/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByText('Wishlist')).toBeInTheDocument();
  });

  it('renders heart icon in button', () => {
    const { container } = render(
      <WishlistProvider>
        <WishlistButton listingId="item-456" />
      </WishlistProvider>
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { WishlistPage } from '../pages/WishlistPage';
import { WishlistProvider } from '../context/WishlistContext';

vi.mock('../api/wishlistApi', () => ({
  wishlistApi: {
    getWishlist: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'wish-1',
          listing: {
            _id: 'listing-1',
            title: 'Digital Systems Textbook',
            price: 400,
            listingType: 'sell',
            category: { name: 'Engineering' },
            condition: 'good',
            images: []
          },
          isUnavailable: false
        }
      ]
    }),
    getWishlistIds: vi.fn().mockResolvedValue({ success: true, data: ['listing-1'] }),
    removeFromWishlist: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('WishlistPage Component', () => {
  it('renders wishlist heading and saved items', async () => {
    render(
      <BrowserRouter>
        <WishlistProvider>
          <WishlistPage />
        </WishlistProvider>
      </BrowserRouter>
    );

    expect(screen.getAllByText(/Loading/i)[0]).toBeInTheDocument();
    expect(await screen.findByText('Digital Systems Textbook')).toBeInTheDocument();
    expect(screen.getByText('₹400')).toBeInTheDocument();
    expect(screen.getByText(/Engineering/)).toBeInTheDocument();
  });
});

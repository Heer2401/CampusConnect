import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ListingForm } from '../components/ListingForm';

// Mock useCategories hook
vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { _id: 'cat1', name: 'Books' },
      { _id: 'cat2', name: 'Electronics' },
    ],
    loading: false,
    error: null,
  }),
}));

describe('ListingForm Component', () => {
  it('toggles fields based on selected listing type', () => {
    const handleSubmit = vi.fn();
    render(<ListingForm onSubmit={handleSubmit} />);

    // Default is sell: Price field should be present
    expect(screen.getByLabelText(/Price/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Rental Rate/i)).not.toBeInTheDocument();

    // Click 'rent' type chip
    const rentButton = screen.getByRole('button', { name: /^rent$/i });
    fireEvent.click(rentButton);

    expect(screen.getByLabelText(/Rental Rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Per Period/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Price/i)).not.toBeInTheDocument();

    // Click 'exchange' type chip
    const exchangeButton = screen.getByRole('button', { name: /^exchange$/i });
    fireEvent.click(exchangeButton);

    expect(screen.getByLabelText(/What do you want in exchange/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Rental Rate/i)).not.toBeInTheDocument();

    // Click 'giveaway' type chip
    const giveawayButton = screen.getByRole('button', { name: /^giveaway$/i });
    fireEvent.click(giveawayButton);

    expect(screen.getByText(/Free Item/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Price/i)).not.toBeInTheDocument();
  });

  it('validates required fields and displays error messages', () => {
    const handleSubmit = vi.fn();
    render(<ListingForm onSubmit={handleSubmit} />);

    // Click Publish without filling fields
    const publishButton = screen.getByRole('button', { name: /Publish Listing/i });
    fireEvent.click(publishButton);

    expect(screen.getByText(/Title must be between 3 and 100 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Description must be between 10 and 2000 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a category/i)).toBeInTheDocument();
    expect(screen.getByText(/Price is required and must be greater than 0/i)).toBeInTheDocument();

    expect(handleSubmit).not.toHaveBeenCalled();
  });
});

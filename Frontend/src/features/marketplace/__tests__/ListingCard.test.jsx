import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ListingCard } from '../components/ListingCard';

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ListingCard Component', () => {
  it('renders a sell listing with price, condition and type badge', () => {
    const listing = {
      _id: '123',
      title: 'Operating Systems Textbook',
      listingType: 'sell',
      price: 350,
      condition: 'good',
      category: { name: 'Books' },
      images: []
    };

    renderWithRouter(<ListingCard listing={listing} />);

    expect(screen.getByText('Operating Systems Textbook')).toBeInTheDocument();
    expect(screen.getByText('₹350')).toBeInTheDocument();
    expect(screen.getByText('Sell')).toBeInTheDocument();
    expect(screen.getByText(/Good condition/)).toBeInTheDocument();
    expect(screen.getByText(/Books/)).toBeInTheDocument();
  });

  it('renders a rent listing with rental rate and period', () => {
    const listing = {
      _id: '124',
      title: 'Casio Scientific Calculator',
      listingType: 'rent',
      rentalRate: 25,
      rentalPeriod: 'week',
      condition: 'like_new',
      category: { name: 'Electronics' },
      images: []
    };

    renderWithRouter(<ListingCard listing={listing} />);

    expect(screen.getByText('Casio Scientific Calculator')).toBeInTheDocument();
    expect(screen.getByText('₹25/week')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
  });

  it('renders a giveaway listing with Free badge', () => {
    const listing = {
      _id: '125',
      title: 'Desk Study Lamp',
      listingType: 'giveaway',
      price: 0,
      condition: 'fair',
      category: { name: 'Hostel Essentials' },
      images: []
    };

    renderWithRouter(<ListingCard listing={listing} />);

    expect(screen.getByText('Desk Study Lamp')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Giveaway')).toBeInTheDocument();
  });
});

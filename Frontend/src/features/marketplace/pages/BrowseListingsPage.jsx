import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useListings } from '../hooks/useListings';
import { useCategories } from '../hooks/useCategories';
import { ListingGrid } from '../components/ListingGrid';
import { ListingFilters } from '../components/ListingFilters';

export const BrowseListingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();

  const currentFilters = {
    category: searchParams.get('category') || '',
    listingType: searchParams.get('listingType') || '',
    condition: searchParams.get('condition') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
    q: searchParams.get('q') || '',
    page: parseInt(searchParams.get('page'), 10) || 1,
  };

  const { listings, meta, loading, error, setFilters, refetch } = useListings(currentFilters);
  const [searchInput, setSearchInput] = useState(currentFilters.q);

  useEffect(() => {
    setFilters(currentFilters);
  }, [searchParams]);

  const updateUrlParams = (newParams) => {
    const updated = { ...currentFilters, ...newParams };
    const sp = new URLSearchParams();
    Object.keys(updated).forEach(k => {
      if (updated[k] !== '' && updated[k] !== undefined && updated[k] !== null) {
        sp.set(k, updated[k]);
      }
    });
    setSearchParams(sp);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateUrlParams({ q: searchInput.trim(), page: 1 });
  };

  const handleChipClick = (typeOrCategory) => {
    if (typeOrCategory === 'all') {
      updateUrlParams({ category: '', listingType: '', page: 1 });
    } else if (['sell', 'rent', 'giveaway', 'exchange'].includes(typeOrCategory)) {
      updateUrlParams({ listingType: typeOrCategory, page: 1 });
    } else {
      updateUrlParams({ category: typeOrCategory, page: 1 });
    }
  };

  return (
    <div className="page">
      {/* Top Search & Actions */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: 10 }}>
          <input
            placeholder="Search items, e.g. 'calculus textbook' or 'table lamp'"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>
        <Link to="/listings/new" className="btn btn-primary">
          + New Listing
        </Link>
      </div>

      {/* Quick Category / Type Chips */}
      <div style={{ marginBottom: 18, display: 'flex', flexWrap: 'wrap' }}>
        <span
          className={`chip ${!currentFilters.category && !currentFilters.listingType ? 'active' : ''}`}
          onClick={() => handleChipClick('all')}
        >
          All
        </span>
        <span
          className={`chip ${currentFilters.listingType === 'rent' ? 'active' : ''}`}
          onClick={() => handleChipClick('rent')}
        >
          Rent
        </span>
        <span
          className={`chip ${currentFilters.listingType === 'giveaway' ? 'active' : ''}`}
          onClick={() => handleChipClick('giveaway')}
        >
          Giveaway
        </span>
        {categories.slice(0, 6).map((cat) => (
          <span
            key={cat._id}
            className={`chip ${currentFilters.category === cat._id ? 'active' : ''}`}
            onClick={() => handleChipClick(cat._id)}
          >
            {cat.name}
          </span>
        ))}
      </div>

      {/* Main Browse Layout */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left Sidebar Filters */}
        <ListingFilters
          filters={currentFilters}
          onChange={(newFilters) => updateUrlParams({ ...newFilters, page: 1 })}
          categories={categories}
        />

        {/* Right Main Grid */}
        <div style={{ flex: 1 }}>
          <ListingGrid
            listings={listings}
            loading={loading}
            error={error}
            onRetry={refetch}
          />

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 28 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={meta.page <= 1}
                onClick={() => updateUrlParams({ page: meta.page - 1 })}
              >
                ← Previous
              </button>
              <span className="muted">
                Page <b>{meta.page}</b> of <b>{meta.totalPages}</b> ({meta.total} items)
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={meta.page >= meta.totalPages}
                onClick={() => updateUrlParams({ page: meta.page + 1 })}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

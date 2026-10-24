import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useListings } from '../hooks/useListings';
import { useCategories } from '../hooks/useCategories';
import { ListingGrid } from '../components/ListingGrid';
import { ListingFilters } from '../components/ListingFilters';
import '../marketplace.css';

export const BrowseListingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();

  const currentFilters = {
    category: searchParams.get('category') || '',
    listingType: searchParams.get('listingType') || '',
    condition: searchParams.get('condition') || '',
    status: searchParams.get('status') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
    q: searchParams.get('q') || '',
    page: parseInt(searchParams.get('page'), 10) || 1,
  };

  const { listings, meta, loading, error, setFilters, refetch } = useListings(currentFilters);
  const [searchInput, setSearchInput] = useState(currentFilters.q);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
    setFilters(currentFilters);
  }, [searchParams]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateUrlParams = (newParams) => {
    const updated = { ...currentFilters, ...newParams };
    const sp = new URLSearchParams();
    Object.keys(updated).forEach((k) => {
      if (updated[k] !== '' && updated[k] !== undefined && updated[k] !== null) {
        sp.set(k, updated[k]);
      }
    });
    setSearchParams(sp);
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateUrlParams({ q: searchInput.trim(), page: 1 });
  };

  const selectedCategoryObj = categories.find((c) => c._id === currentFilters.category);

  // Active filter count (excluding pagination & default sort)
  const activeFilterCount = [
    currentFilters.q,
    currentFilters.category,
    currentFilters.listingType,
    currentFilters.condition,
    currentFilters.status,
    currentFilters.minPrice || currentFilters.maxPrice,
  ].filter(Boolean).length;

  // Build applied chips for display above results
  const appliedChips = [];
  if (currentFilters.listingType) {
    const typeLabels = {
      sell: 'Sell',
      rent: 'Rent',
      exchange: 'Exchange',
      giveaway: 'Giveaway',
    };
    appliedChips.push({
      key: 'listingType',
      label: typeLabels[currentFilters.listingType] || currentFilters.listingType,
      onRemove: () => updateUrlParams({ listingType: '', page: 1 }),
    });
  }

  if (currentFilters.category) {
    appliedChips.push({
      key: 'category',
      label: selectedCategoryObj?.name || 'Category',
      onRemove: () => updateUrlParams({ category: '', page: 1 }),
    });
  }

  if (currentFilters.minPrice && currentFilters.maxPrice) {
    appliedChips.push({
      key: 'price',
      label: `₹${currentFilters.minPrice} - ₹${currentFilters.maxPrice}`,
      onRemove: () => updateUrlParams({ minPrice: '', maxPrice: '', page: 1 }),
    });
  } else if (currentFilters.minPrice) {
    appliedChips.push({
      key: 'minPrice',
      label: `From ₹${currentFilters.minPrice}`,
      onRemove: () => updateUrlParams({ minPrice: '', page: 1 }),
    });
  } else if (currentFilters.maxPrice) {
    appliedChips.push({
      key: 'maxPrice',
      label: `Under ₹${currentFilters.maxPrice}`,
      onRemove: () => updateUrlParams({ maxPrice: '', page: 1 }),
    });
  }

  if (currentFilters.condition) {
    const condLabels = {
      new: 'New',
      like_new: 'Like New',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
    };
    appliedChips.push({
      key: 'condition',
      label: condLabels[currentFilters.condition] || currentFilters.condition,
      onRemove: () => updateUrlParams({ condition: '', page: 1 }),
    });
  }

  if (currentFilters.status) {
    const statusLabels = {
      reserved: 'Reserved',
      rented: 'Rented',
      sold: 'Sold',
    };
    appliedChips.push({
      key: 'status',
      label: `Status: ${statusLabels[currentFilters.status] || currentFilters.status}`,
      onRemove: () => updateUrlParams({ status: '', page: 1 }),
    });
  }

  if (currentFilters.q) {
    appliedChips.push({
      key: 'q',
      label: `"${currentFilters.q}"`,
      onRemove: () => {
        setSearchInput('');
        updateUrlParams({ q: '', page: 1 });
      },
    });
  }

  // Listing Types definition
  const LISTING_TYPES = [
    { id: '', label: 'All' },
    { id: 'sell', label: 'Sell' },
    { id: 'rent', label: 'Rent' },
    { id: 'exchange', label: 'Exchange' },
    { id: 'giveaway', label: 'Giveaway' },
  ];

  // Frequently used categories for desktop quick chips (first 5-6)
  const quickCategories = categories.slice(0, 5);

  return (
    <div className="marketplace-page page">
      {/* ── Top Search & Actions Bar ─────────────────────────────────────────── */}
      <div className="browse-header">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: 10 }}>
          <input
            placeholder="Search items, e.g. 'calculus textbook' or 'table lamp'"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          {searchInput && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchInput('');
                updateUrlParams({ q: '', page: 1 });
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </form>
        <Link to="/marketplace/create" className="btn btn-primary">
          + New Listing
        </Link>
      </div>

      {/* ── Problem 1: Separate Control 1: Listing Type Segmented Control ──────── */}
      <div className="listing-type-row">
        <span className="control-label">Listing Type:</span>
        <div className="type-segmented-group">
          {LISTING_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`type-pill-btn ${currentFilters.listingType === t.id ? 'active' : ''}`}
              onClick={() => updateUrlParams({ listingType: t.id, page: 1 })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Problem 1: Separate Control 2: Category Dropdown & Quick Chips ─────── */}
      <div className="category-row">
        {/* Category Dropdown Control ("All Categories ▼") */}
        <div className="category-dropdown-wrapper" ref={categoryDropdownRef}>
          <button
            type="button"
            className={`category-dropdown-btn ${currentFilters.category ? 'active' : ''}`}
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
          >
            <span>{selectedCategoryObj ? selectedCategoryObj.name : 'All Categories'}</span>
            <span style={{ fontSize: 10, marginLeft: 2 }}>{isCategoryDropdownOpen ? '▲' : '▼'}</span>
          </button>

          {isCategoryDropdownOpen && (
            <div className="category-dropdown-menu">
              <button
                type="button"
                className={`category-menu-item ${!currentFilters.category ? 'active' : ''}`}
                onClick={() => {
                  updateUrlParams({ category: '', page: 1 });
                  setIsCategoryDropdownOpen(false);
                }}
              >
                <span>All Categories</span>
                <span>✓</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  className={`category-menu-item ${currentFilters.category === cat._id ? 'active' : ''}`}
                  onClick={() => {
                    updateUrlParams({ category: cat._id, page: 1 });
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  <span>{cat.name}</span>
                  {cat.listingCount !== undefined && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>({cat.listingCount})</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Horizontally scrollable quick category chips */}
        <div className="category-scroll-container">
          {quickCategories.map((cat) => (
            <span
              key={cat._id}
              className={`chip ${currentFilters.category === cat._id ? 'active' : ''}`}
              style={{ margin: 0 }}
              onClick={() => {
                const nextVal = currentFilters.category === cat._id ? '' : cat._id;
                updateUrlParams({ category: nextVal, page: 1 });
              }}
            >
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* ── Problem 2: Marketplace Results Toolbar (Toggle & Count & Sort) ────── */}
      <div className="marketplace-toolbar">
        <div className="marketplace-toolbar-left">
          <button
            type="button"
            className={`btn-filter-toggle ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => {
              if (window.innerWidth < 860) {
                setIsMobileDrawerOpen(true);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
            title={isSidebarOpen ? 'Hide filter sidebar' : 'Show filter sidebar'}
          >
            <span>⚙️</span>
            <span>{isSidebarOpen ? 'Hide Filters' : 'Show Filters'}</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>
          <span className="results-count">
            Showing <strong>{meta.total ?? listings.length}</strong> items
          </span>
        </div>

        <div className="marketplace-toolbar-right">
          <label htmlFor="toolbar-sort" className="sort-label">Sort:</label>
          <select
            id="toolbar-sort"
            className="sort-select"
            value={currentFilters.sort || 'newest'}
            onChange={(e) => updateUrlParams({ sort: e.target.value, page: 1 })}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* ── Problem 2: Applied Filter Chips Row with Clear All ─────────────────── */}
      {appliedChips.length > 0 && (
        <div className="applied-filters-bar">
          <span className="applied-filters-label">Active filters:</span>
          {appliedChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="applied-chip"
              onClick={chip.onRemove}
              title={`Remove ${chip.label}`}
            >
              <span>{chip.label}</span>
              <span className="chip-remove-x">✕</span>
            </button>
          ))}
          <button
            type="button"
            className="btn-clear-all"
            onClick={handleClearAll}
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Main Browse Layout: Collapsible Sidebar & Grid ───────────────────── */}
      <div className="browse-layout">
        {/* Desktop Sidebar (Collapsible) */}
        {isSidebarOpen && (
          <ListingFilters
            className="sidebar desktop-sidebar"
            filters={currentFilters}
            onChange={(newFilters) => updateUrlParams({ ...newFilters, page: 1 })}
            categories={categories}
            onReset={handleClearAll}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Listings Grid (expands to grid4 when sidebar is hidden) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ListingGrid
            listings={listings}
            loading={loading}
            error={error}
            onRetry={refetch}
            gridClass={isSidebarOpen ? 'grid3' : 'grid4'}
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

      {/* ── Mobile Filter Drawer / Modal ─────────────────────────────────────── */}
      {isMobileDrawerOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setIsMobileDrawerOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <h3>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</h3>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="mobile-drawer-body">
              <ListingFilters
                filters={currentFilters}
                onChange={(newFilters) => updateUrlParams({ ...newFilters, page: 1 })}
                categories={categories}
                onReset={handleClearAll}
              />
            </div>
            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearAll}
              >
                Clear All
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                Show Results ({meta.total ?? listings.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

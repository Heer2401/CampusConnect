import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useListings } from '../hooks/useListings';
import { useCategories } from '../hooks/useCategories';
import { ListingGrid } from '../components/ListingGrid';
import { ListingFilters } from '../components/ListingFilters';
import { MarketplaceHero } from '../components/MarketplaceHero';
import {
  SlidersHorizontal,
  LayoutGrid,
  BookOpen,
  FileText,
  FileSpreadsheet,
  Laptop,
  FlaskConical,
  Home,
  Armchair,
  Shirt,
  Dumbbell,
  Bike,
  PenTool,
  Music,
  PartyPopper,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
} from 'lucide-react';
import '../marketplace.css';

const LISTING_TYPES = [
  { id: '', label: 'All' },
  { id: 'sell', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'exchange', label: 'Swap' },
  { id: 'giveaway', label: 'Free' },
];

// Fallback list of all 14 backend categories with default demo counts
const BACKEND_CATEGORIES_FALLBACK = [
  { slug: 'books-textbooks', name: 'Books & Textbooks', listingCount: 420 },
  { slug: 'notes-study-material', name: 'Notes & Study Material', listingCount: 310 },
  { slug: 'question-papers', name: 'Question Papers', listingCount: 180 },
  { slug: 'electronics-gadgets', name: 'Electronics & Gadgets', listingCount: 520 },
  { slug: 'lab-equipment', name: 'Lab Equipment', listingCount: 140 },
  { slug: 'hostel-room-essentials', name: 'Hostel & Room Essentials', listingCount: 230 },
  { slug: 'furniture', name: 'Furniture', listingCount: 110 },
  { slug: 'clothing-accessories', name: 'Clothing & Accessories', listingCount: 175 },
  { slug: 'sports-fitness', name: 'Sports & Fitness', listingCount: 90 },
  { slug: 'cycles-transport', name: 'Cycles & Transport', listingCount: 95 },
  { slug: 'stationery', name: 'Stationery', listingCount: 260 },
  { slug: 'musical-instruments', name: 'Musical Instruments', listingCount: 65 },
  { slug: 'event-costume-items', name: 'Event/Costume Items', listingCount: 40 },
  { slug: 'others', name: 'Others', listingCount: 85 },
];

// Resolves a matching Lucide icon for any backend category
const getCategoryIcon = (category) => {
  const slug = (category?.slug || '').toLowerCase();
  const name = (category?.name || '').toLowerCase();

  if (slug.includes('book') || name.includes('book')) return BookOpen;
  if (slug.includes('note') || name.includes('note') || name.includes('study')) return FileText;
  if (slug.includes('paper') || name.includes('paper') || name.includes('question')) return FileSpreadsheet;
  if (slug.includes('electronic') || name.includes('electronic') || name.includes('gadget')) return Laptop;
  if (slug.includes('lab') || name.includes('lab') || name.includes('equipment')) return FlaskConical;
  if (slug.includes('hostel') || name.includes('hostel') || name.includes('room')) return Home;
  if (slug.includes('furniture') || name.includes('furniture')) return Armchair;
  if (slug.includes('cloth') || name.includes('cloth') || name.includes('accessories')) return Shirt;
  if (slug.includes('sport') || name.includes('sport') || name.includes('fitness')) return Dumbbell;
  if (slug.includes('cycle') || name.includes('cycle') || name.includes('transport') || name.includes('bike')) return Bike;
  if (slug.includes('stationery') || name.includes('stationery') || name.includes('pen')) return PenTool;
  if (slug.includes('music') || name.includes('music') || name.includes('instrument')) return Music;
  if (slug.includes('costume') || name.includes('costume') || name.includes('event')) return PartyPopper;
  return Layers;
};

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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const categoryScrollRef = useRef(null);

  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
    setFilters(currentFilters);
  }, [searchParams]);

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
    if (e) e.preventDefault();
    updateUrlParams({ q: searchInput.trim(), page: 1 });
  };

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'right' ? 240 : -240,
        behavior: 'smooth',
      });
    }
  };

  // Merge backend categories with fallback metadata and sort by item count (categories with items first, zeroes at the end)
  const displayCategories = React.useMemo(() => {
    const list = categories && categories.length > 0
      ? categories.map((cat) => {
          const fb = BACKEND_CATEGORIES_FALLBACK.find(
            (f) => f.slug === cat.slug || f.name.toLowerCase() === cat.name.toLowerCase()
          );
          return {
            ...cat,
            listingCount: cat.listingCount ?? fb?.listingCount ?? 0,
          };
        })
      : BACKEND_CATEGORIES_FALLBACK;

    // Sort categories: highest count first, with 0-item categories at the end
    return [...list].sort((a, b) => {
      const countA = a.listingCount ?? 0;
      const countB = b.listingCount ?? 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [categories]);

  // Compute total items for "All"
  const totalItemsCount = React.useMemo(() => {
    if (meta && typeof meta.total === 'number' && meta.total > 0) {
      return meta.total >= 1000 ? `${(meta.total / 1000).toFixed(1)}K items` : `${meta.total} items`;
    }
    const sum = displayCategories.reduce((acc, c) => acc + (c.listingCount || 0), 0);
    return sum >= 1000 ? `${(sum / 1000).toFixed(1)}K items` : `${sum || 22} items`;
  }, [meta, displayCategories]);

  // Active filter chips
  const appliedChips = [];

  if (currentFilters.minPrice || currentFilters.maxPrice) {
    let priceLabel = '';
    const minVal = currentFilters.minPrice ? Number(currentFilters.minPrice).toLocaleString('en-IN') : null;
    const maxVal = currentFilters.maxPrice ? Number(currentFilters.maxPrice).toLocaleString('en-IN') : null;

    if (minVal !== null && maxVal !== null) {
      priceLabel = `₹${minVal} - ₹${maxVal}`;
    } else if (maxVal !== null) {
      priceLabel = `₹0 - ₹${maxVal}`;
    } else {
      priceLabel = `≥ ₹${minVal}`;
    }

    appliedChips.push({
      key: 'price',
      label: priceLabel,
      onRemove: () => updateUrlParams({ minPrice: '', maxPrice: '', page: 1 }),
    });
  }

  if (currentFilters.condition) {
    const condLabels = {
      new: 'New',
      like_new: 'Like new',
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

  if (currentFilters.category) {
    const selectedCat = displayCategories.find(
      (c) => c._id === currentFilters.category || c.slug === currentFilters.category
    );
    if (selectedCat) {
      appliedChips.push({
        key: 'category',
        label: selectedCat.name,
        onRemove: () => updateUrlParams({ category: '', page: 1 }),
      });
    }
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

  const activeFilterCount = appliedChips.length;

  return (
    <div
      className="marketplace-page"
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Full-Width 100% Hero Header Banner ─────────────────────────── */}
      <MarketplaceHero
        currentListingType={currentFilters.listingType}
        onSelectType={(typeId) => updateUrlParams({ listingType: typeId, page: 1 })}
        searchInput={searchInput}
        onSearchInputChange={(val) => setSearchInput(val)}
        onSearchSubmit={handleSearchSubmit}
        onSelectTrending={(kw) => {
          setSearchInput(kw);
          updateUrlParams({ q: kw, page: 1 });
        }}
      />

      {/* ── Main Listings Body (Centered 1280px Container) ───────────────── */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1.75rem 1.5rem 3.5rem',
          boxSizing: 'border-box',
        }}
      >
        {/* ── 2. Categories Row (Horizontal scroll with icons & count) ──────── */}
        <div className="categories-horizontal-section">
          <span className="categories-section-label">Categories</span>

          <div className="categories-scroll-wrapper">
            {/* Horizontally Scrollable Categories Track */}
            <div ref={categoryScrollRef} className="categories-scroll-track">
              {/* "All" Card — Matches Mockup with Centered Icon & Cyan Border */}
              <button
                type="button"
                onClick={() => updateUrlParams({ category: '', page: 1 })}
                className={`cat-card-item cat-card-item--all ${!currentFilters.category ? 'active' : ''}`}
                title="All Categories"
              >
                <LayoutGrid size={17} className="cat-icon" />
                <div className="cat-text-col" style={{ alignItems: 'center' }}>
                  <span className="cat-title">All</span>
                  <span className="cat-count">{totalItemsCount}</span>
                </div>
              </button>

              {/* All Backend Categories */}
              {displayCategories.map((cat) => {
                const CatIcon = getCategoryIcon(cat);
                const isSelected =
                  currentFilters.category === cat._id ||
                  currentFilters.category === cat.slug;
                const count = cat.listingCount ?? 0;
                const countDisplay = `${count} ${count === 1 ? 'item' : 'items'}`;

                return (
                  <button
                    key={cat._id || cat.slug}
                    type="button"
                    onClick={() => {
                      const nextVal = isSelected ? '' : (cat._id || cat.slug);
                      updateUrlParams({ category: nextVal, page: 1 });
                    }}
                    className={`cat-card-item ${isSelected ? 'active' : ''}`}
                    title={cat.name}
                  >
                    <CatIcon size={17} className="cat-icon" />
                    <div className="cat-text-col">
                      <span className="cat-title">{cat.name}</span>
                      <span className="cat-count">{countDisplay}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="cat-scroll-arrow-btn"
              title="Scroll categories right"
              aria-label="Scroll right"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* ── 3. Type Filter & Sort Row (Matches Mockup) ────────────────────── */}
        <div className="type-sort-row">
          {/* Left: Type pills */}
          <div className="type-filter-group">
            <span className="filter-group-label">Type:</span>
            {LISTING_TYPES.map((type) => {
              const isActive = currentFilters.listingType === type.id;
              return (
                <button
                  key={type.id || 'all'}
                  type="button"
                  onClick={() => updateUrlParams({ listingType: type.id, page: 1 })}
                  className={`type-pill-btn ${isActive ? 'active' : ''}`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* Right: Sort by Dropdown */}
          <div className="sort-select-group">
            <span className="filter-group-label">Sort by:</span>
            <div className="sort-select-wrapper">
              <select
                value={currentFilters.sort || 'newest'}
                onChange={(e) => updateUrlParams({ sort: e.target.value, page: 1 })}
                className="sort-dropdown-select"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
              </select>
              <ChevronDown size={14} className="sort-select-chevron" />
            </div>
          </div>
        </div>

        {/* ── 4. Active Filters & Results Count Row (Matches Mockup) ────────── */}
        <div className="active-filters-row">
          <div className="active-filters-left">
            {/* Filters Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`btn-filters-toggle ${isSidebarOpen ? 'active' : ''}`}
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="filters-badge-count">{activeFilterCount}</span>
              )}
            </button>

            {/* Active Filter Chips */}
            {appliedChips.map((chip) => (
              <span key={chip.key} className="active-filter-chip">
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="chip-remove-btn"
                  title="Remove filter"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </span>
            ))}

            {/* Clear all Link */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="btn-clear-all-filters"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Right: Showing Range Count */}
          <span className="results-showing-text">
            Showing {listings.length > 0 ? (currentFilters.page - 1) * 12 + 1 : 0}–
            {Math.min(currentFilters.page * 12, meta.total ?? listings.length)} of{' '}
            {meta.total ?? listings.length}
          </span>
        </div>

        {/* ── 5. Main Browse Layout: Optional Collapsible Sidebar & 4-Column Grid */}
        <div id="browse-listings-grid" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* Optional Collapsible Filter Sidebar */}
          {isSidebarOpen && (
            <div style={{ width: '260px', flexShrink: 0 }}>
              <ListingFilters
                className="sidebar"
                filters={currentFilters}
                onChange={(newFilters) => updateUrlParams({ ...newFilters, page: 1 })}
                categories={categories}
                onReset={handleClearAll}
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          )}

          {/* Listings Grid (4-column grid4 when sidebar is off) */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <ListingGrid
              listings={listings}
              loading={loading}
              error={error}
              onRetry={refetch}
              gridClass={isSidebarOpen ? 'grid3' : 'grid4'}
            />

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 28,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={meta.page <= 1}
                  onClick={() => updateUrlParams({ page: meta.page - 1 })}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Page <b>{meta.page}</b> of <b>{meta.totalPages}</b>
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => updateUrlParams({ page: meta.page + 1 })}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {isMobileDrawerOpen && (
          <div className="mobile-drawer-backdrop" onClick={() => setIsMobileDrawerOpen(false)}>
            <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-drawer-header">
                <h3>Filters</h3>
                <button
                  type="button"
                  className="mobile-drawer-close"
                  onClick={() => setIsMobileDrawerOpen(false)}
                >
                  <X size={18} />
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseListingsPage;

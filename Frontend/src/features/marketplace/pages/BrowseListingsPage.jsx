import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useListings } from '../hooks/useListings';
import { useCategories } from '../hooks/useCategories';
import { ListingGrid } from '../components/ListingGrid';
import { ListingFilters } from '../components/ListingFilters';
import {
  Search,
  Plus,
  SlidersHorizontal,
  LayoutGrid,
  BookOpen,
  FileText,
  FileSpreadsheet,
  Laptop,
  FlaskConical,
  Home,
  ChevronRight,
  X,
} from 'lucide-react';
import '../marketplace.css';

// Collegiate Campus Illustration SVG for hero banner
function CampusIllustration() {
  return (
    <svg
      width="280"
      height="95"
      viewBox="0 0 280 95"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      className="marketplace-hero-skyline"
    >
      {/* Soft background foliage */}
      <circle cx="195" cy="62" r="16" fill="#86efac" fillOpacity="0.4" />
      <circle cx="212" cy="58" r="20" fill="#4ade80" fillOpacity="0.3" />
      <circle cx="248" cy="60" r="18" fill="#86efac" fillOpacity="0.35" />
      <circle cx="266" cy="65" r="14" fill="#22c55e" fillOpacity="0.25" />

      {/* Subtle clouds */}
      <path
        d="M238 24a7 7 0 0 1 13 0 5 5 0 0 1 7 5h-24a4 4 0 0 1 4-5z"
        fill="#e0f2fe"
        fillOpacity="0.7"
      />
      <path
        d="M182 28a6 6 0 0 1 11 0 4 4 0 0 1 6 4h-20a3 3 0 0 1 3-4z"
        fill="#e0f2fe"
        fillOpacity="0.6"
      />

      {/* Ground Line */}
      <line x1="160" y1="82" x2="278" y2="82" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />

      {/* Left Wing */}
      <rect x="175" y="56" width="32" height="26" fill="#ffffff" stroke="#93c5fd" strokeWidth="1.2" />
      <line x1="175" y1="56" x2="207" y2="56" stroke="#60a5fa" strokeWidth="1.5" />
      {/* Left Wing Windows */}
      <rect x="180" y="60" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="189" y="60" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="198" y="60" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="180" y="70" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="189" y="70" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="198" y="70" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />

      {/* Right Wing */}
      <rect x="235" y="56" width="32" height="26" fill="#ffffff" stroke="#93c5fd" strokeWidth="1.2" />
      <line x1="235" y1="56" x2="267" y2="56" stroke="#60a5fa" strokeWidth="1.5" />
      {/* Right Wing Windows */}
      <rect x="240" y="60" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="249" y="60" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="258" y="60" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="240" y="70" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="249" y="70" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />
      <rect x="258" y="70" width="5" height="7" rx="1" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.8" />

      {/* Center Clock Tower */}
      <rect x="207" y="42" width="28" height="40" fill="#ffffff" stroke="#60a5fa" strokeWidth="1.2" />
      {/* Tower Roof */}
      <polygon points="207,42 221,22 235,42" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.2" />
      <line x1="221" y1="22" x2="221" y2="15" stroke="#2563eb" strokeWidth="1.2" />
      <circle cx="221" cy="14" r="1.5" fill="#2563eb" />

      {/* Clock Face */}
      <circle cx="221" cy="33" r="5" fill="#f0f9ff" stroke="#3b82f6" strokeWidth="1" />
      <line x1="221" y1="33" x2="221" y2="30.5" stroke="#1d4ed8" strokeWidth="0.8" />
      <line x1="221" y1="33" x2="223.5" y2="33" stroke="#1d4ed8" strokeWidth="0.8" />

      {/* Center Arch Entrance */}
      <path d="M217 82 v-7 a4 4 0 0 1 8 0 v7 z" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" />

      {/* Tower Windows */}
      <rect x="211" y="47" width="5" height="7" rx="1" fill="#eff6ff" stroke="#60a5fa" strokeWidth="0.8" />
      <rect x="225" y="47" width="5" height="7" rx="1" fill="#eff6ff" stroke="#60a5fa" strokeWidth="0.8" />
    </svg>
  );
}

const LISTING_TYPES = [
  { id: '', label: 'All' },
  { id: 'sell', label: 'Sell' },
  { id: 'rent', label: 'Rent' },
  { id: 'exchange', label: 'Exchange' },
  { id: 'giveaway', label: 'Giveaway' },
];

const PRESET_CATEGORIES = [
  { name: 'Books & Textbooks', icon: BookOpen },
  { name: 'Notes & Study Material', icon: FileText },
  { name: 'Question Papers', icon: FileSpreadsheet },
  { name: 'Electronics & Gadgets', icon: Laptop },
  { name: 'Lab Equipment', icon: FlaskConical },
  { name: 'Hostel & Room Essentials', icon: Home },
];

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

  // User specifically requested: "keep filter off in start with option to show filter"
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

  const scrollCategoriesRight = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: 180, behavior: 'smooth' });
    }
  };

  // Build active filter chips for display
  const appliedChips = [];
  if (currentFilters.status) {
    appliedChips.push({
      key: 'status',
      label: currentFilters.status === 'available' ? 'Available' : currentFilters.status,
      onRemove: () => updateUrlParams({ status: '', page: 1 }),
    });
  } else {
    // Show "Available" chip by default when no status filter is applied, matching Image 2
    appliedChips.push({
      key: 'status',
      label: 'Available',
      onRemove: () => updateUrlParams({ status: 'all', page: 1 }),
    });
  }

  if (currentFilters.listingType) {
    const typeObj = LISTING_TYPES.find((t) => t.id === currentFilters.listingType);
    appliedChips.push({
      key: 'listingType',
      label: typeObj ? typeObj.label : currentFilters.listingType,
      onRemove: () => updateUrlParams({ listingType: '', page: 1 }),
    });
  }

  if (currentFilters.category) {
    const selectedCat = categories.find((c) => c._id === currentFilters.category);
    appliedChips.push({
      key: 'category',
      label: selectedCat ? selectedCat.name : 'Category',
      onRemove: () => updateUrlParams({ category: '', page: 1 }),
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

  return (
    <div
      className="marketplace-page page"
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '1.75rem 1.25rem 3rem',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Hero Header Banner (with campus illustration) ─────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Find what you need on campus
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: '#64748b',
              margin: 0,
            }}
          >
            Buy, rent, exchange, or give away essentials with fellow students.
          </p>
        </div>

        <CampusIllustration />
      </div>

      {/* ── 2. Search Row & + New Listing Button ──────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '280px',
          }}
        >
          {/* Search Input with Magnifying Glass icon */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={18}
              color="#94a3b8"
              style={{
                position: 'absolute',
                left: '14px',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search items, e.g. 'calculus textbook' or 'table lamp'"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px 0 42px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem',
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Solid Blue Search Button */}
          <button
            type="submit"
            style={{
              height: '44px',
              padding: '0 20px',
              background: '#1d4ed8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Search size={15} />
            <span>Search</span>
          </button>
        </form>

        {/* Soft Blue "+ New Listing" Button */}
        <Link
          to="/marketplace/create"
          style={{
            height: '44px',
            padding: '0 18px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#2563eb',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <Plus size={16} />
          <span>New Listing</span>
        </Link>
      </div>

      {/* ── 3. Listing Type Row ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '0.85rem',
            color: '#475569',
            fontWeight: 500,
            minWidth: '85px',
          }}
        >
          Listing type
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {LISTING_TYPES.map((t) => {
            const isActive = currentFilters.listingType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateUrlParams({ listingType: t.id, page: 1 })}
                style={{
                  background: isActive ? '#0f172a' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  borderRadius: '999px',
                  padding: '6px 18px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Categories Row (Horizontal scroll with icons & arrow) ──────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1.25rem',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontSize: '0.85rem',
            color: '#475569',
            fontWeight: 500,
            minWidth: '85px',
            flexShrink: 0,
          }}
        >
          Categories
        </span>

        {/* Horizontally scrollable category pills */}
        <div
          ref={categoryScrollRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            whiteSpace: 'nowrap',
            flex: 1,
            padding: '2px 0',
          }}
        >
          {/* All Categories Pill */}
          <button
            type="button"
            onClick={() => updateUrlParams({ category: '', page: 1 })}
            style={{
              background: !currentFilters.category ? '#eff6ff' : '#ffffff',
              color: !currentFilters.category ? '#1d4ed8' : '#334155',
              border: !currentFilters.category ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: !currentFilters.category ? 700 : 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <LayoutGrid size={14} />
            <span>All Categories</span>
          </button>

          {/* Preset Categories mapped to real backend or names */}
          {PRESET_CATEGORIES.map((preset) => {
            const CatIcon = preset.icon;
            // Match with backend category ID if available
            const matchingCat = categories.find(
              (c) =>
                c.name?.toLowerCase().includes(preset.name.toLowerCase().split(' ')[0]) ||
                preset.name.toLowerCase().includes(c.name?.toLowerCase().split(' ')[0])
            );
            const catId = matchingCat ? matchingCat._id : preset.name;
            const isSelected = currentFilters.category === catId;

            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  const nextVal = isSelected ? '' : catId;
                  updateUrlParams({ category: nextVal, page: 1 });
                }}
                style={{
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#334155',
                  border: isSelected ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  borderRadius: '999px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <CatIcon size={14} />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow scroll button */}
        <button
          type="button"
          onClick={scrollCategoriesRight}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          title="Scroll more categories"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── 5. Toolbar Row (Filters toggle, Active Chip, Clear All, Count, Sort) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Filters Toggle Button (Off at start) */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              background: isSidebarOpen ? '#eff6ff' : '#ffffff',
              color: isSidebarOpen ? '#1d4ed8' : '#0f172a',
              border: isSidebarOpen ? '1px solid #93c5fd' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={14} color={isSidebarOpen ? '#1d4ed8' : '#2563eb'} />
            <span>Filters</span>
          </button>

          {/* Active Chips (e.g. "Available") */}
          {appliedChips.map((chip) => (
            <span
              key={chip.key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#059669',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Clear All Link */}
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#2563eb',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            Clear all
          </button>

          {/* Listing Count */}
          <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700, marginLeft: '6px' }}>
            {meta.total ?? listings.length} listings
          </span>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sort by:</span>
          <select
            value={currentFilters.sort || 'newest'}
            onChange={(e) => updateUrlParams({ sort: e.target.value, page: 1 })}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              color: '#0f172a',
              background: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* ── 6. Main Browse Layout: Collapsible Sidebar & 4-Column Grid ───────── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Optional Collapsible Filter Sidebar (starts OFF) */}
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
  );
};

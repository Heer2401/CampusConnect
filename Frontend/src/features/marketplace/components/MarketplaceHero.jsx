import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Search,
  ArrowRight,
  FileText,
  ShoppingBag,
  Calendar,
  Repeat,
  Gift,
  GraduationCap,
  Leaf,
  Users,
} from 'lucide-react';
import './MarketplaceHero.css';

const FILTER_TABS = [
  { id: '', label: 'All' },
  { id: 'sell', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'exchange', label: 'Swap' },
  { id: 'giveaway', label: 'Free' },
];

const TRENDING_KEYWORDS = ['Calculator', 'Cycle', 'Guitar', 'Lab coat'];

export const MarketplaceHero = ({
  currentListingType = '',
  onSelectType,
  searchInput = '',
  onSearchInputChange,
  onSearchSubmit,
  onSelectTrending,
}) => {
  const handleTabClick = (typeId) => {
    if (onSelectType) onSelectType(typeId);
  };

  const handleTrendingClick = (keyword) => {
    if (onSelectTrending) {
      onSelectTrending(keyword);
    } else if (onSearchInputChange && onSearchSubmit) {
      onSearchInputChange(keyword);
      setTimeout(() => onSearchSubmit(keyword), 50);
    }
  };

  const scrollToBrowse = (typeId) => {
    if (onSelectType) onSelectType(typeId);
    const gridEl = document.getElementById('browse-listings-grid');
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="marketplace-hero-section">
      <div className="marketplace-hero-inner">
        {/* ── Left Column: Headlines, Tabs, Search, Trending ──────────────── */}
        <div className="marketplace-hero-left">
          {/* Eyebrow badge */}
          <div className="marketplace-hero-eyebrow">
            <Compass size={14} className="eyebrow-icon" />
            <span className="eyebrow-text">A SMARTER WAY TO SHARE CAMPUS RESOURCES</span>
            <span className="eyebrow-dash">—</span>
          </div>

          {/* Headline */}
          <h1 className="marketplace-hero-title">
            Your Campus.
            <br />
            Your <span className="title-teal">Marketplace.</span>
          </h1>

          {/* Subtext */}
          <p className="marketplace-hero-subtext">
            Buy, rent, swap or give away essentials with students on your campus.
          </p>

          {/* Filter Tabs (Pill switcher) */}
          <div className="marketplace-hero-tabs-wrapper">
            <div className="marketplace-hero-tabs" role="tablist">
              {FILTER_TABS.map((tab) => {
                const isActive = currentListingType === tab.id;
                return (
                  <button
                    key={tab.id || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`marketplace-hero-tab ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Bar — Clean, no internal rectangular outline */}
          <form className="marketplace-hero-search-form" onSubmit={onSearchSubmit}>
            <div className="marketplace-hero-search-bar">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search for textbooks, calculators, cycles, lab coats..."
                value={searchInput}
                onChange={(e) => onSearchInputChange && onSearchInputChange(e.target.value)}
              />
              <button
                type="submit"
                className="search-submit-btn"
                aria-label="Search marketplace"
                title="Search"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </form>

          {/* Trending Section */}
          <div className="marketplace-hero-trending-row">
            <div className="trending-left">
              <span className="trending-label">Trending:</span>
              <div className="trending-chips">
                {TRENDING_KEYWORDS.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    className="trending-chip"
                    onClick={() => handleTrendingClick(kw)}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            <Link to="/requests" className="post-request-link">
              <FileText size={15} />
              <span>Post a request →</span>
            </Link>
          </div>
        </div>

        {/* ── Right Column: 4 Tilted Cards with Sticker & Text (Image 2) ── */}
        <div className="marketplace-hero-right">
          {/* Orbital vector background track */}
          <svg
            className="hero-orbital-path-svg"
            viewBox="0 0 540 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M 50 170 C 20 60, 260 20, 480 80 C 530 180, 490 330, 260 350 C 90 360, 40 270, 50 170 Z"
              stroke="url(#orbitGradient)"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              strokeOpacity="0.45"
            />
            {/* Dot Matrix accent on right */}
            <g opacity="0.35" fill="#3B82F6">
              <circle cx="505" cy="115" r="1.5" />
              <circle cx="520" cy="115" r="1.5" />
              <circle cx="535" cy="115" r="1.5" />
              <circle cx="505" cy="130" r="1.5" />
              <circle cx="520" cy="130" r="1.5" />
              <circle cx="535" cy="130" r="1.5" />
              <circle cx="505" cy="145" r="1.5" />
              <circle cx="520" cy="145" r="1.5" />
              <circle cx="535" cy="145" r="1.5" />
            </g>
            <defs>
              <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="35%" stopColor="#10B981" />
                <stop offset="70%" stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>

          {/* Floating Orbital Badges */}
          <div className="orbital-badge badge-purple" title="Academics & Courses">
            <GraduationCap size={16} color="#ffffff" />
          </div>
          <div className="orbital-badge badge-green" title="Eco Sustainability">
            <Leaf size={16} color="#ffffff" />
          </div>
          <div className="orbital-badge badge-orange" title="Campus Community">
            <Users size={16} color="#ffffff" />
          </div>

          {/* Sparkle Dashes on Top Left */}
          <div className="sparkle-dash-group" aria-hidden="true">
            <span className="dash dash-1" />
            <span className="dash dash-2" />
            <span className="dash dash-3" />
          </div>

          {/* 4 Restructured Action Cards (Card + Isolated Illustration + Lower-Left Meta + Lower-Right Arrow) */}
          <div className="hero-interactive-cards-grid">
            {/* ── 1. Buy Card ───────────────────────────────────────── */}
            <div
              className="restructured-card card-buy"
              onClick={() => scrollToBrowse('sell')}
              role="button"
              tabIndex={0}
              title="Buy — Textbooks, electronics and more"
            >
              <div className="card-top-header">
                <span className="sticker-badge badge-buy">
                  <ShoppingBag size={13} />
                  <span>Buy</span>
                </span>
                <div className="card-product-illustration">
                  <img
                    src="/images/product-buy.png"
                    alt="Laptop on textbooks with smartphone and earbuds"
                    className="product-img"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="card-content-body">
                <h3 className="card-headline">Find items to buy</h3>
                <p className="card-tagline">Textbooks, electronics and more.</p>
                <div className="card-footer-meta">
                  <span className="card-action-text">Explore deals</span>
                  <div className="card-arrow-circle arrow-circle-blue">
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2. Rent Card ──────────────────────────────────────── */}
            <div
              className="restructured-card card-rent"
              onClick={() => scrollToBrowse('rent')}
              role="button"
              tabIndex={0}
              title="Rent — Rent what you need"
            >
              <div className="card-top-header">
                <span className="sticker-badge badge-rent">
                  <Calendar size={13} />
                  <span>Rent</span>
                </span>
                <div className="card-product-illustration">
                  <img
                    src="/images/product-rent.png"
                    alt="Camera, suitcase and sports equipment"
                    className="product-img"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="card-content-body">
                <h3 className="card-headline">Rent what you need</h3>
                <p className="card-tagline">For the time you need.</p>
                <div className="card-footer-meta">
                  <span className="card-action-text">Flexible terms</span>
                  <div className="card-arrow-circle arrow-circle-green">
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. Swap Card ──────────────────────────────────────── */}
            <div
              className="restructured-card card-swap"
              onClick={() => scrollToBrowse('exchange')}
              role="button"
              tabIndex={0}
              title="Swap — Exchange with peers"
            >
              <div className="card-top-header">
                <span className="sticker-badge badge-swap">
                  <Repeat size={13} />
                  <span>Swap</span>
                </span>
                <div className="card-product-illustration">
                  <img
                    src="/images/product-swap.png"
                    alt="Hoodie, sneakers and books"
                    className="product-img"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="card-content-body">
                <h3 className="card-headline">Exchange with peers</h3>
                <p className="card-tagline">Swap items and save.</p>
                <div className="card-footer-meta">
                  <span className="card-action-text">Trade directly</span>
                  <div className="card-arrow-circle arrow-circle-purple">
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. Free Card ──────────────────────────────────────── */}
            <div
              className="restructured-card card-free"
              onClick={() => scrollToBrowse('giveaway')}
              role="button"
              tabIndex={0}
              title="Free — Give away or find for free"
            >
              <div className="card-top-header">
                <span className="sticker-badge badge-free">
                  <Gift size={13} />
                  <span>Free</span>
                </span>
                <div className="card-product-illustration">
                  <img
                    src="/images/product-free.png"
                    alt="Donation gift box with teddy bear and books"
                    className="product-img"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="card-content-body">
                <h3 className="card-headline">Give away or find for free</h3>
                <p className="card-tagline">Help a fellow student.</p>
                <div className="card-footer-meta">
                  <span className="card-action-text">Claim or donate</span>
                  <div className="card-arrow-circle arrow-circle-orange">
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

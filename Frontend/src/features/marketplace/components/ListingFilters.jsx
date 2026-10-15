import React from 'react';

export const ListingFilters = ({ filters = {}, onChange, categories = [] }) => {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleReset = () => {
    onChange({
      category: '',
      listingType: '',
      condition: '',
      minPrice: '',
      maxPrice: '',
      status: '',
      sort: 'newest',
    });
  };

  return (
    <div className="sidebar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, margin: 0 }}>Filters</h2>
        <button
          type="button"
          onClick={handleReset}
          style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: 12, cursor: 'pointer', padding: 0 }}
        >
          Reset
        </button>
      </div>

      <label htmlFor="filter-category">Category</label>
      <select
        id="filter-category"
        value={filters.category || ''}
        onChange={(e) => handleChange('category', e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name} {c.listingCount !== undefined ? `(${c.listingCount})` : ''}
          </option>
        ))}
      </select>

      <label htmlFor="filter-type">Listing Type</label>
      <select
        id="filter-type"
        value={filters.listingType || ''}
        onChange={(e) => handleChange('listingType', e.target.value)}
      >
        <option value="">All Types</option>
        <option value="sell">Sell</option>
        <option value="rent">Rent</option>
        <option value="exchange">Exchange</option>
        <option value="giveaway">Giveaway</option>
      </select>

      <label htmlFor="filter-status">Availability</label>
      <select
        id="filter-status"
        value={filters.status || ''}
        onChange={(e) => handleChange('status', e.target.value)}
      >
        <option value="">Active (Available)</option>
        <option value="reserved">Reserved</option>
        <option value="rented">Rented</option>
        <option value="sold">Sold</option>
      </select>

      <label htmlFor="filter-condition">Condition</label>
      <select
        id="filter-condition"
        value={filters.condition || ''}
        onChange={(e) => handleChange('condition', e.target.value)}
      >
        <option value="">Any Condition</option>
        <option value="new">New</option>
        <option value="like_new">Like New</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Poor</option>
      </select>

      <label>Price Range (₹)</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="number"
          placeholder="Min"
          value={filters.minPrice || ''}
          onChange={(e) => handleChange('minPrice', e.target.value)}
          style={{ width: '50%' }}
        />
        <span>-</span>
        <input
          type="number"
          placeholder="Max"
          value={filters.maxPrice || ''}
          onChange={(e) => handleChange('maxPrice', e.target.value)}
          style={{ width: '50%' }}
        />
      </div>

      <label htmlFor="filter-sort">Sort By</label>
      <select
        id="filter-sort"
        value={filters.sort || 'newest'}
        onChange={(e) => handleChange('sort', e.target.value)}
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
    </div>
  );
};

import React from 'react';

export const ListingFilters = ({
  filters = {},
  onChange,
  onReset,
  onClose,
  className = 'sidebar',
}) => {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange({
        condition: '',
        minPrice: '',
        maxPrice: '',
      });
    }
  };

  const activeCount = [
    filters.condition,
    filters.minPrice || filters.maxPrice,
  ].filter(Boolean).length;

  return (
    <div className={className}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Filters</h2>
          {activeCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: '#e0e7ff',
                color: '#3730a3',
                padding: '2px 6px',
                borderRadius: 999,
              }}
            >
              {activeCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Clear filters
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                cursor: 'pointer',
                color: '#475569',
              }}
              title="Close filters"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Condition Filter */}
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

      {/* Price Range Filter */}
      <label>Price Range (₹)</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
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
    </div>
  );
};

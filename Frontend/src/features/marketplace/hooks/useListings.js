import { useState, useEffect, useCallback } from 'react';
import { listingsApi } from '../api/listingsApi';

export const useListings = (initialFilters = {}) => {
  const [listings, setListings] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchListings = useCallback(async (customParams) => {
    try {
      setLoading(true);
      setError(null);
      const paramsToUse = customParams || filters;
      const res = await listingsApi.getListings(paramsToUse);
      setListings(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: newFilters.page || 1 }));
  };

  return {
    listings,
    meta,
    loading,
    error,
    filters,
    setFilters: updateFilters,
    refetch: fetchListings,
  };
};

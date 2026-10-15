import { apiClient } from './client';

export const categoriesApi = {
  getCategories: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/categories${query ? `?${query}` : ''}`;
    const res = await apiClient(endpoint);
    return res.data;
  },

  getCategory: async (idOrSlug) => {
    const res = await apiClient(`/categories/${idOrSlug}`);
    return res.data;
  },
};

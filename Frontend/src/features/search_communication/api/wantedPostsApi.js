import { apiClient } from '../../marketplace/api/client';

export const wantedPostsApi = {
  list: async ({ mine = false } = {}) => {
    const query = mine ? '?mine=true' : '';
    const response = await apiClient(`/wanted-posts${query}`);
    return response.data;
  },
  create: async (body) => {
    const response = await apiClient('/wanted-posts', { method: 'POST', body });
    return response.data;
  },
  close: async (id) => {
    const response = await apiClient(`/wanted-posts/${id}/close`, { method: 'PATCH', body: {} });
    return response.data;
  },
};

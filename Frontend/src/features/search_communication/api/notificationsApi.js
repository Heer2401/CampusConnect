import { apiClient } from '../../marketplace/api/client';

export const notificationsApi = {
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiClient(`/notifications${query ? `?${query}` : ''}`);
  },

  markRead: async (id) => {
    return await apiClient(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  },

  markAllRead: async () => {
    return await apiClient('/notifications/read-all', {
      method: 'PATCH'
    });
  },

  deleteNotification: async (id) => {
    return await apiClient(`/notifications/${id}`, {
      method: 'DELETE'
    });
  }
};

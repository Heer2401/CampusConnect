import { apiClient } from '../../marketplace/api/client';

export const chatApi = {
  getThreads: async () => {
    return await apiClient('/chat/threads');
  },

  createOrGetThread: async (listingId, recipientId) => {
    return await apiClient('/chat/threads', {
      method: 'POST',
      body: { listingId, recipientId }
    });
  },

  getThreadById: async (id) => {
    return await apiClient(`/chat/threads/${id}`);
  },

  getMessages: async (threadId) => {
    return await apiClient(`/chat/threads/${threadId}/messages`);
  },

  sendMessage: async (threadId, content, type = 'text') => {
    return await apiClient(`/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: { content, type }
    });
  },

  markThreadRead: async (threadId) => {
    return await apiClient(`/chat/threads/${threadId}/read`, {
      method: 'PATCH'
    });
  }
};

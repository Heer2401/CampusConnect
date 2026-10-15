import { apiClient } from '../../marketplace/api/client';

export const wishlistApi = {
  getWishlist: async () => {
    return await apiClient('/wishlist');
  },

  getWishlistIds: async () => {
    return await apiClient('/wishlist/ids');
  },

  addToWishlist: async (listingId) => {
    return await apiClient('/wishlist', {
      method: 'POST',
      body: { listingId }
    });
  },

  removeFromWishlist: async (listingId) => {
    return await apiClient(`/wishlist/${listingId}`, {
      method: 'DELETE'
    });
  },

  checkWishlistStatus: async (listingId) => {
    return await apiClient(`/wishlist/check/${listingId}`);
  }
};

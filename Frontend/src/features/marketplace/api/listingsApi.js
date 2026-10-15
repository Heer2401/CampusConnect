import { apiClient } from './client';

export const listingsApi = {
  getListings: async (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== '' && params[key] !== undefined && params[key] !== null) {
        cleanParams[key] = params[key];
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = `/listings${query ? `?${query}` : ''}`;
    return await apiClient(endpoint);
  },

  getMyListings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/listings/mine${query ? `?${query}` : ''}`;
    return await apiClient(endpoint);
  },

  getListingById: async (id) => {
    const res = await apiClient(`/listings/${id}`);
    return res.data;
  },

  createListing: async (listingData) => {
    const res = await apiClient('/listings', {
      method: 'POST',
      body: listingData,
    });
    return res.data;
  },

  updateListing: async (id, updateData) => {
    const res = await apiClient(`/listings/${id}`, {
      method: 'PATCH',
      body: updateData,
    });
    return res.data;
  },

  deleteListing: async (id) => {
    return await apiClient(`/listings/${id}`, {
      method: 'DELETE',
    });
  },

  uploadImages: async (listingId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    const res = await apiClient(`/listings/${listingId}/images`, {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
    return res.data;
  },

  deleteImage: async (listingId, imageId) => {
    const res = await apiClient(`/listings/${listingId}/images/${imageId}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  reorderImages: async (listingId, orderData) => {
    const res = await apiClient(`/listings/${listingId}/images/order`, {
      method: 'PATCH',
      body: orderData,
    });
    return res.data;
  },
};

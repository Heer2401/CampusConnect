import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wishlistApi } from '../api/wishlistApi';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const fetchWishlistIds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await wishlistApi.getWishlistIds();
      if (res && res.data) {
        setWishlistIds(new Set(res.data));
      }
    } catch (err) {
      // If unauthenticated or network error, silently keep empty set
      setWishlistIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlistIds();
  }, [fetchWishlistIds]);

  const isWishlisted = useCallback((listingId) => {
    return wishlistIds.has(listingId);
  }, [wishlistIds]);

  const toggleWishlist = useCallback(async (listingId) => {
    if (!listingId) return false;
    const currentlySaved = wishlistIds.has(listingId);

    // Optimistic UI update
    setWishlistIds(prev => {
      const next = new Set(prev);
      if (currentlySaved) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });

    try {
      if (currentlySaved) {
        await wishlistApi.removeFromWishlist(listingId);
      } else {
        await wishlistApi.addToWishlist(listingId);
      }
      return !currentlySaved;
    } catch (err) {
      // Revert optimistic update on failure
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (currentlySaved) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        return next;
      });
      throw err;
    }
  }, [wishlistIds]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistCount: wishlistIds.size,
        isWishlisted,
        toggleWishlist,
        refreshWishlist: fetchWishlistIds,
        loading
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    return {
      wishlistIds: new Set(),
      wishlistCount: 0,
      isWishlisted: () => false,
      toggleWishlist: async () => false,
      refreshWishlist: () => {},
      loading: false
    };
  }
  return context;
};

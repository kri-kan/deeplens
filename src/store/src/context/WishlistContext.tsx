import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

interface WishlistContextValue {
  wishlistIds: string[];
  wishlistCount: number;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextValue>({
  wishlistIds: [],
  wishlistCount: 0,
  isInWishlist: () => false,
  toggleWishlist: () => {},
  clearWishlist: () => {},
});

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const saved = localStorage.getItem('vayyari_wishlist_ids');
      if (saved) {
        try { setWishlistIds(JSON.parse(saved)); } catch {}
      }
    }
  }, []);

  const saveWishlist = (newIds: string[]) => {
    setWishlistIds(newIds);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('vayyari_wishlist_ids', JSON.stringify(newIds));
    }
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  const toggleWishlist = (productId: string) => {
    if (isInWishlist(productId)) {
      saveWishlist(wishlistIds.filter((id) => id !== productId));
    } else {
      saveWishlist([...wishlistIds, productId]);
    }
  };

  const clearWishlist = () => saveWishlist([]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistCount: wishlistIds.length,
        isInWishlist,
        toggleWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);

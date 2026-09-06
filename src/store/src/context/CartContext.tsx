import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { StoreProduct, EthnicSwatch } from '../services/mock/mockCatalogService';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  brand: string;
  price: number;
  originalPrice: number;
  image: string;
  swatch?: EthnicSwatch;
  size?: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: StoreProduct, swatch?: EthnicSwatch, size?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  itemCount: 0,
  subtotal: 0,
  discountTotal: 0,
  grandTotal: 0,
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const saved = localStorage.getItem('vayyari_cart_items');
      if (saved) {
        try { setItems(JSON.parse(saved)); } catch {}
      }
    }
  }, []);

  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('vayyari_cart_items', JSON.stringify(newItems));
    }
  };

  const addItem = (product: StoreProduct, swatch?: EthnicSwatch, size = 'Free Size') => {
    const existingIndex = items.findIndex(
      (it) => it.productId === product.id && it.swatch?.id === swatch?.id && it.size === size
    );

    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      saveCart(updated);
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: product.id,
        title: product.title,
        brand: product.brand,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.images[0],
        swatch: swatch || product.swatches[0],
        size,
        quantity: 1,
      };
      saveCart([...items, newItem]);
    }
    setIsDrawerOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    saveCart(items.filter((it) => it.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    const updated = items.map((it) => (it.id === cartItemId ? { ...it, quantity } : it));
    saveCart(updated);
  };

  const clearCart = () => saveCart([]);

  const itemCount = items.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const originalSubtotal = items.reduce((acc, it) => acc + it.originalPrice * it.quantity, 0);
  const discountTotal = Math.max(0, originalSubtotal - subtotal);
  const grandTotal = subtotal;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        discountTotal,
        grandTotal,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

import React, { useState, useEffect } from 'react';
import { PreviewBar } from './PreviewBar';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { Header } from './Header';
import { CartDrawer } from './CartDrawer';
import type { ThemeMode, ViewportMode, Category, CartItem } from '../types/store';

interface StoreLayoutProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartItems: CartItem[];
  onUpdateCartQuantity: (productId: string, delta: number) => void;
  onRemoveCartItem: (productId: string) => void;
  onCheckout: () => void;
  children: React.ReactNode;
}

export const StoreLayout: React.FC<StoreLayoutProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  cartItems,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onCheckout,
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('auto');
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const isPreviewEnabled =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('preview'));

  const effectiveWidth =
    viewportMode === 'mobile'
      ? 375
      : viewportMode === 'tablet'
      ? 834
      : viewportMode === 'desktop'
      ? 1280
      : windowWidth;

  const isMobile = effectiveWidth < 768;
  const isTablet = effectiveWidth >= 768 && effectiveWidth <= 1024;
  const isDesktop = effectiveWidth > 1024;

  const activeBreakpointName = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isPreviewEnabled && (
        <PreviewBar
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          viewportMode={viewportMode}
          onChangeViewportMode={setViewportMode}
          actualWidth={effectiveWidth}
          activeBreakpoint={activeBreakpointName}
        />
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: viewportMode !== 'auto' ? '1.5rem 1rem' : 0,
          background: viewportMode !== 'auto' ? 'rgba(0, 0, 0, 0.15)' : 'transparent',
          transition: 'all var(--transition-normal)',
        }}
      >
        <div
          style={{
            width: viewportMode !== 'auto' ? `${effectiveWidth}px` : '100%',
            maxWidth: '100%',
            minHeight: viewportMode !== 'auto' ? '820px' : '100vh',
            borderRadius: viewportMode !== 'auto' ? 'var(--border-radius-lg)' : 0,
            overflow: 'hidden',
            boxShadow: viewportMode !== 'auto' ? 'var(--shadow-lg), var(--shadow-accent)' : 'none',
            background: 'var(--bg-base)',
            display: 'flex',
            position: 'relative',
            transition: 'width var(--transition-normal)',
          }}
        >
          {isDesktop && (
            <Sidebar
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={onSelectCategory}
              activeTab={activeTab}
              onSelectTab={onSelectTab}
            />
          )}

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              paddingBottom: isMobile ? '70px' : 0,
            }}
          >
            <Header
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              cartCount={cartCount}
              onOpenCart={() => setIsCartOpen(true)}
              isMobileOrTablet={!isDesktop}
            />

            <main
              style={{
                flex: 1,
                padding: isMobile ? '1rem' : '1.5rem 2rem',
                maxWidth: '1400px',
                width: '100%',
                margin: '0 auto',
              }}
            >
              {children}
            </main>
          </div>

          {isMobile && (
            <BottomTabBar
              activeTab={activeTab}
              onSelectTab={onSelectTab}
              cartCount={cartCount}
              onOpenCart={() => setIsCartOpen(true)}
            />
          )}
        </div>
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={onUpdateCartQuantity}
        onRemoveItem={onRemoveCartItem}
        onCheckout={() => {
          onCheckout();
          setIsCartOpen(false);
        }}
      />
    </div>
  );
};

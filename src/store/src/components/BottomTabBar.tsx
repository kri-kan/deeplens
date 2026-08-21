import React from 'react';
import { Home, Compass, Grid, Bookmark, ShoppingBag } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  cartCount,
  onOpenCart,
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'catalog', label: 'Explore', icon: Compass },
    { id: 'categories', label: 'Categories', icon: Grid },
    { id: 'saved', label: 'Saved', icon: Bookmark },
  ];

  return (
    <nav
      className="glass-surface"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 0.5rem',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
        borderTopLeftRadius: 'var(--border-radius-lg)',
        borderTopRightRadius: 'var(--border-radius-lg)',
        transition: 'all var(--transition-normal)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.2rem',
              background: 'transparent',
              border: 'none',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontSize: 'var(--fz-3xs)',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              flex: 1,
              height: '100%',
              transition: 'all var(--transition-bounce)',
            }}
          >
            <div
              style={{
                position: 'relative',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--border-radius-pill)',
                background: isActive ? 'var(--bg-surface-3)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={20} />
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}

      {/* Cart Quick Button in Mobile Tab Bar */}
      <button
        onClick={onOpenCart}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 'var(--fz-3xs)',
          fontWeight: 500,
          cursor: 'pointer',
          flex: 1,
          height: '100%',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--border-radius-pill)',
          }}
        >
          <ShoppingBag size={20} />
          {cartCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '4px',
                background: 'linear-gradient(135deg, var(--emerald-600), var(--emerald-400))',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-emerald)',
              }}
            >
              {cartCount}
            </span>
          )}
        </div>
        <span>Cart</span>
      </button>
    </nav>
  );
};

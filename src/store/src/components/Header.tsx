import React from 'react';
import { Search, ShoppingBag, Sparkles, Bell } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  isMobileOrTablet: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  cartCount,
  onOpenCart,
  isMobileOrTablet,
}) => {
  return (
    <header
      className="glass-surface"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        transition: 'all var(--transition-normal)',
      }}
    >
      {/* Mobile/Tablet Brand Logo */}
      {isMobileOrTablet && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--border-radius-sm)',
              background: 'linear-gradient(135deg, var(--pink-600), var(--pink-400))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <Sparkles size={18} />
          </div>
          <h2 style={{ fontSize: 'var(--fz-sm)', margin: 0, letterSpacing: '-0.02em' }}>VAYYARI</h2>
        </div>
      )}

      {/* Search Input Bar with 'No-Line' surface depth */}
      <div
        style={{
          flex: 1,
          maxWidth: '520px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Search
          size={18}
          color="var(--text-muted)"
          style={{
            position: 'absolute',
            left: '1rem',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search lenses, optics, frames, precision gear..."
          style={{
            width: '100%',
            padding: '0.65rem 1rem 0.65rem 2.6rem',
            borderRadius: 'var(--border-radius-pill)',
            border: 'none',
            background: 'var(--bg-surface-2)',
            color: 'var(--text-primary)',
            fontSize: 'var(--fz-xs)',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            transition: 'all var(--transition-bounce)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onFocus={(e) => {
            e.target.style.background = 'var(--bg-surface-1)';
            e.target.style.boxShadow = 'var(--shadow-md), 0 0 0 2px var(--accent-primary)';
          }}
          onBlur={(e) => {
            e.target.style.background = 'var(--bg-surface-2)';
            e.target.style.boxShadow = 'var(--shadow-sm)';
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--border-radius-pill)',
            border: 'none',
            background: 'var(--bg-surface-2)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* Cart Button */}
        <button
          onClick={onOpenCart}
          className="btn-pink"
          style={{
            padding: '0.5rem 1rem',
            position: 'relative',
          }}
        >
          <ShoppingBag size={18} />
          <span style={{ fontSize: 'var(--fz-xs)' }}>Cart</span>
          {cartCount > 0 && (
            <span
              style={{
                background: '#ffffff',
                color: 'var(--pink-700)',
                fontSize: '11px',
                fontWeight: 800,
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--border-radius-pill)',
                marginLeft: '0.2rem',
              }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

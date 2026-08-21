import React from 'react';
import { Home, Sparkles, Flame, Tag, Bookmark, ShieldCheck, Grid, Compass } from 'lucide-react';
import type { Category } from '../types/store';

interface SidebarProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  activeTab,
  onSelectTab,
}) => {
  const mainNavItems = [
    { id: 'home', label: 'Store Front', icon: Home },
    { id: 'catalog', label: 'Explore Catalog', icon: Compass },
    { id: 'new', label: 'New Arrivals', icon: Sparkles },
    { id: 'bestsellers', label: 'Bestsellers', icon: Flame },
    { id: 'offers', label: 'Special Offers', icon: Tag },
    { id: 'saved', label: 'Saved Wishlist', icon: Bookmark },
  ];

  return (
    <aside
      className="surface-shift-1"
      style={{
        width: '260px',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.5rem 1rem',
        zIndex: 90,
        transition: 'all var(--transition-normal)',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem 1.5rem 0.5rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--border-radius-md)',
              background: 'linear-gradient(135deg, var(--emerald-600), var(--emerald-400))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-emerald)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--fz-md)', margin: 0, letterSpacing: '-0.02em' }}>VAYYARI</h2>
            <p style={{ fontSize: 'var(--fz-2xs)', color: 'var(--text-muted)', margin: 0 }}>Lens & Optics Boutique</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '2rem' }}>
          <span
            style={{
              fontSize: 'var(--fz-3xs)',
              fontWeight: 700,
              color: 'var(--text-subtle)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 0.75rem 0.5rem 0.75rem',
            }}
          >
            Main Menu
          </span>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: 'none',
                  background: isActive ? 'var(--bg-surface-3)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 'var(--fz-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Icon size={18} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span
            style={{
              fontSize: 'var(--fz-3xs)',
              fontWeight: 700,
              color: 'var(--text-subtle)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 0.75rem 0.5rem 0.75rem',
            }}
          >
            Categories
          </span>
          <button
            onClick={() => onSelectCategory('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--border-radius-sm)',
              border: 'none',
              background: activeCategory === 'all' ? 'var(--bg-surface-2)' : 'transparent',
              color: activeCategory === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeCategory === 'all' ? 700 : 500,
              fontSize: 'var(--fz-xs)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Grid size={16} />
              <span>All Products</span>
            </div>
          </button>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.85rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: 'none',
                  background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 'var(--fz-xs)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span>{cat.name}</span>
                <span
                  style={{
                    fontSize: 'var(--fz-3xs)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--border-radius-pill)',
                    background: 'var(--bg-surface-3)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="surface-shift-2"
        style={{
          padding: '1rem',
          borderRadius: 'var(--border-radius-md)',
          marginTop: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--accent-primary)' }}>
          <ShieldCheck size={18} />
          <span style={{ fontWeight: 700, fontSize: 'var(--fz-xs)' }}>Vayyari Guarantee</span>
        </div>
        <p style={{ fontSize: 'var(--fz-2xs)', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
          30-day trial & complimentary lens calibration on every optics order.
        </p>
      </div>
    </aside>
  );
};

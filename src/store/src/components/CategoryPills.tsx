import React from 'react';
import type { Category } from '../types/store';
import { Sparkles } from 'lucide-react';

interface CategoryPillsProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        overflowX: 'auto',
        padding: '0.5rem 0',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <button
        onClick={() => onSelectCategory('all')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.45rem 1rem',
          borderRadius: 'var(--border-radius-pill)',
          border: 'none',
          background: activeCategory === 'all' ? 'var(--emerald-600)' : 'var(--bg-surface-2)',
          color: activeCategory === 'all' ? '#ffffff' : 'var(--text-primary)',
          fontWeight: activeCategory === 'all' ? 700 : 500,
          fontSize: 'var(--fz-xs)',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          boxShadow: activeCategory === 'all' ? 'var(--shadow-emerald)' : 'var(--shadow-sm)',
          transition: 'all var(--transition-bounce)',
        }}
      >
        <Sparkles size={14} />
        <span>All Optics</span>
      </button>

      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: 'var(--border-radius-pill)',
              border: 'none',
              background: isActive ? 'var(--emerald-600)' : 'var(--bg-surface-2)',
              color: isActive ? '#ffffff' : 'var(--text-primary)',
              fontWeight: isActive ? 700 : 500,
              fontSize: 'var(--fz-xs)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              boxShadow: isActive ? 'var(--shadow-emerald)' : 'var(--shadow-sm)',
              transition: 'all var(--transition-bounce)',
            }}
          >
            <span>{cat.name}</span>
            <span
              style={{
                fontSize: 'var(--fz-3xs)',
                opacity: 0.8,
                background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface-3)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                padding: '0.1rem 0.4rem',
                borderRadius: 'var(--border-radius-pill)',
              }}
            >
              {cat.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

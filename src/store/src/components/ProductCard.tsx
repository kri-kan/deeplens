import type { Product } from '../types/store';
import { Star, ShoppingBag, CheckCircle2 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isInCart: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isInCart,
}) => {
  return (
    <div className="cq-card-container">
      <div className="no-line-card cq-card-content" style={{ padding: '1rem', height: '100%' }}>
        <div className="cq-card-media" style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--border-radius-sm)' }}>
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: '100%',
              height: '180px',
              objectFit: 'cover',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--bg-surface-2)',
              transition: 'transform var(--transition-normal)',
            }}
          />
          {product.badge && (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                background: 'linear-gradient(135deg, var(--emerald-600), var(--emerald-500))',
                color: '#ffffff',
                fontSize: 'var(--fz-3xs)',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--border-radius-pill)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {product.badge}
            </span>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginTop: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: 'var(--fz-3xs)', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
                {product.category}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Star size={13} fill="var(--accent-amber)" color="var(--accent-amber)" />
                <span style={{ fontSize: 'var(--fz-2xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {product.rating}
                </span>
                <span style={{ fontSize: 'var(--fz-3xs)', color: 'var(--text-muted)' }}>
                  ({product.reviewsCount})
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: 'var(--fz-sm)', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
              {product.name}
            </h3>

            <p
              style={{
                fontSize: 'var(--fz-2xs)',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                marginBottom: '0.75rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.description}
            </p>

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {Object.entries(product.specs).slice(0, 2).map(([key, val]) => (
                <span
                  key={key}
                  style={{
                    fontSize: 'var(--fz-3xs)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--border-radius-xs)',
                    background: 'var(--bg-surface-2)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {key}: {val}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <div>
              <span style={{ fontSize: 'var(--fz-3xs)', color: 'var(--text-subtle)', display: 'block' }}>USD</span>
              <span style={{ fontSize: 'var(--fz-md)', fontWeight: 800, color: 'var(--accent-primary)' }}>
                ${product.price.toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => onAddToCart(product)}
              className={isInCart ? 'btn-secondary' : 'btn-emerald'}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: 'var(--fz-2xs)',
              }}
            >
              {isInCart ? (
                <>
                  <CheckCircle2 size={14} color="var(--emerald-600)" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={14} />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

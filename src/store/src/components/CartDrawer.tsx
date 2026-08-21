import React from 'react';
import type { CartItem } from '../types/store';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const shipping = subtotal > 150 || subtotal === 0 ? 0 : 15;
  const grandTotal = subtotal + tax + shipping;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div
        className="surface-shift-1"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 10,
          animation: 'slideInRight 300ms ease-out',
        }}
      >
        <div
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--bg-surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: 'var(--fz-md)', margin: 0 }}>Your Cart</h2>
            <span
              style={{
                fontSize: 'var(--fz-3xs)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--border-radius-pill)',
                background: 'var(--bg-surface-3)',
                color: 'var(--accent-primary)',
                fontWeight: 700,
              }}
            >
              {items.reduce((sum, item) => sum + item.quantity, 0)} Items
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-surface-2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: 'var(--fz-sm)', fontWeight: 600 }}>Your cart is empty</p>
              <p style={{ fontSize: 'var(--fz-2xs)', marginTop: '0.35rem' }}>
                Add precision optics to preview itemized totals.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="surface-shift-2"
                  style={{
                    display: 'flex',
                    gap: '0.85rem',
                    padding: '0.85rem',
                    borderRadius: 'var(--border-radius-sm)',
                  }}
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    style={{
                      width: '70px',
                      height: '70px',
                      objectFit: 'cover',
                      borderRadius: 'var(--border-radius-xs)',
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: 'var(--fz-xs)', margin: 0, fontWeight: 700 }}>{item.product.name}</h4>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-subtle)',
                            cursor: 'pointer',
                            padding: '0.1rem',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <span style={{ fontSize: 'var(--fz-2xs)', color: 'var(--text-muted)' }}>
                        ${item.product.price.toFixed(2)} each
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'var(--bg-surface-1)',
                          padding: '0.15rem 0.4rem',
                          borderRadius: 'var(--border-radius-pill)',
                        }}
                      >
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: 'var(--fz-xs)', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <span style={{ fontSize: 'var(--fz-sm)', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div
            style={{
              padding: '1.25rem',
              background: 'var(--bg-surface-2)',
              borderTop: '1px solid var(--bg-surface-3)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', fontSize: 'var(--fz-2xs)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Estimated Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Standard Shipping</span>
                <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: 'var(--fz-md)',
                  color: 'var(--text-primary)',
                  paddingTop: '0.5rem',
                  borderTop: '1px dashed var(--bg-surface-3)',
                }}
              >
                <span>Total</span>
                <span style={{ color: 'var(--accent-primary)' }}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="btn-pink"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: 'var(--fz-sm)',
              }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.75rem', opacity: 0.7 }}>
              <ShieldCheck size={14} color="var(--pink-600)" />
              <span style={{ fontSize: 'var(--fz-3xs)', color: 'var(--text-muted)' }}>
                Encrypted 256-Bit Vayyari Checkout Guarantee
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import { useState, useMemo } from 'react';
import { StoreLayout } from './components/StoreLayout';
import { HeroBanner } from './components/HeroBanner';
import { CategoryPills } from './components/CategoryPills';
import { ProductCard } from './components/ProductCard';
import type { Category, Product, CartItem } from './types/store';
import { CheckCircle2 } from 'lucide-react';

const MOCK_CATEGORIES: Category[] = [
  { id: 'microscope', name: 'Micro-Optics', icon: 'Microscope', count: 8 },
  { id: 'telescope', name: 'Astro Lenses', icon: 'Telescope', count: 6 },
  { id: 'camera', name: 'Cinema Anamorphic', icon: 'Camera', count: 12 },
  { id: 'spectral', name: 'Thermal Filters', icon: 'Sun', count: 5 },
  { id: 'eyewear', name: 'Precision Eyewear', icon: 'Glasses', count: 9 },
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'vayyari-apex-100x',
    name: 'Vayyari Apex 100x Oil Immersion Micro-Objective',
    category: 'microscope',
    price: 1240.0,
    rating: 4.96,
    reviewsCount: 142,
    description: 'Apochromatic fluorite glass system with 1.40 Numerical Aperture. Eliminates spherical aberration across 400nm-750nm spectrum.',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    badge: 'Flagship Optics',
    isNew: true,
    isBestseller: true,
    specs: { NA: '1.40', Spectrum: '400-750nm', Mount: 'RMS Thread' },
  },
  {
    id: 'vayyari-stellaris-200',
    name: 'Stellaris 200mm ED Triplet Apochromat Telescope Lens',
    category: 'telescope',
    price: 3450.0,
    rating: 4.99,
    reviewsCount: 89,
    description: 'Extra-low dispersion FCD100 glass element with dual-speed 3.7" rack-and-pinion focuser for deep-sky astrophotography.',
    image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80',
    badge: 'Astro Grade',
    isNew: false,
    isBestseller: true,
    specs: { FocalLength: '1200mm', Ratio: 'f/6.0', Glass: 'FCD100' },
  },
  {
    id: 'vayyari-cine-50t',
    name: 'Vayyari Cine-X 50mm T1.3 Full Frame Anamorphic',
    category: 'camera',
    price: 4890.0,
    rating: 4.92,
    reviewsCount: 67,
    description: '1.8x anamorphic squeeze ratio with oval bokeh and signature emerald lens flares. 12-blade aperture mechanism.',
    image: 'https://images.unsplash.com/photo-1617575521317-d2974f3b56d2?auto=format&fit=crop&w=800&q=80',
    badge: 'Cinema Master',
    isNew: true,
    isBestseller: false,
    specs: { Aperture: 'T1.3', Squeeze: '1.8x', Mount: 'PL / EF' },
  },
  {
    id: 'vayyari-hyperspec-7',
    name: 'HyperSpec-7 Narrowband Nebula Optical Filter',
    category: 'spectral',
    price: 680.0,
    rating: 4.88,
    reviewsCount: 114,
    description: '3nm H-Alpha and OIII dual narrowband filter with 98.5% light transmission peak for light-polluted urban imaging.',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    badge: '98.5% Transmission',
    specs: { Bandwidth: '3nm Dual', Size: '2" Filter', Coating: 'Ion-Assisted' },
  },
  {
    id: 'vayyari-titanium-eyewear',
    name: 'Vayyari Lumina Aero Titanium Blue-Light Frame',
    category: 'eyewear',
    price: 320.0,
    rating: 4.95,
    reviewsCount: 310,
    description: '12-gram Japanese beta-titanium frames fitted with Vayyari 420nm anti-fatigue prescription-ready optical glass.',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
    badge: '12g Ultralight',
    isBestseller: true,
    specs: { Material: 'Beta Titanium', Coating: 'Anti-Glare 16-Layer', Weight: '12g' },
  },
  {
    id: 'vayyari-micro-macro-90',
    name: 'Vayyari BioLens 90mm f/2.8 2:1 Super Macro',
    category: 'microscope',
    price: 950.0,
    rating: 4.89,
    reviewsCount: 53,
    description: 'Continuous magnification from 1x to 2x life size with internal focusing and twin LED ring lamp mount.',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    badge: '2:1 Magnification',
    specs: { Ratio: '2:1 Super Macro', Focus: 'Manual Precision', Blades: '9' },
  },
];

export function App() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { product: MOCK_PRODUCTS[0], quantity: 1 },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added ${product.name} to your cart`);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removed from cart');
  };

  const handleCheckout = () => {
    showToast('Order submitted! Thank you for purchasing from Vayyari Optics.');
    setCartItems([]);
  };

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <StoreLayout
      categories={MOCK_CATEGORIES}
      activeCategory={activeCategory}
      onSelectCategory={setActiveCategory}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      cartItems={cartItems}
      onUpdateCartQuantity={handleUpdateCartQuantity}
      onRemoveCartItem={handleRemoveCartItem}
      onCheckout={handleCheckout}
    >
      <HeroBanner
        onExploreClick={() => {
          setActiveCategory('all');
          const catalogEl = document.getElementById('catalog-section');
          if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <div id="catalog-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: 'var(--fz-xl)', margin: 0 }}>Precision Catalog</h2>
            <p style={{ fontSize: 'var(--fz-2xs)', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Showing {filteredProducts.length} certified optics instruments
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: 'var(--fz-2xs)', color: 'var(--text-subtle)' }}>Surface Depth:</span>
            <span className="emerald-badge">No-Line Active</span>
          </div>
        </div>

        <CategoryPills
          categories={MOCK_CATEGORIES}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '3rem',
        }}
      >
        {filteredProducts.map((product) => {
          const isInCart = cartItems.some((item) => item.product.id === product.id);
          return (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              isInCart={isInCart}
            />
          );
        })}
      </div>

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            zIndex: 3000,
            background: 'var(--emerald-600)',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--border-radius-pill)',
            boxShadow: 'var(--shadow-lg), var(--shadow-emerald)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: 'var(--fz-xs)',
            animation: 'slideInUp 200ms ease-out',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </StoreLayout>
  );
}

export default App;

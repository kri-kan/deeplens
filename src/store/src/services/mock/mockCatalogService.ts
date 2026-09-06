export interface EthnicSwatch {
  id: string;
  name: string;
  type: 'solid' | 'contrast' | 'dhup_chhaon' | 'split' | 'grid';
  primaryHex: string;
  secondaryHex?: string;
  accentHex?: string;
  imageUrl?: string;
}

export interface StoreProduct {
  id: string;
  code: string;
  title: string;
  brand: string;
  category: 'saree' | 'silk' | 'kurta' | 'lehanga' | 'jewelry' | 'home';
  price: number;
  originalPrice: number;
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  images: string[];
  swatches: EthnicSwatch[];
  fabric: string;
  weaveOrigin: string;
  description: string;
  features: string[];
}

export const MOCK_STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 'prod-kanjivaram-royal',
    code: 'VY-KAN-01',
    title: 'Kanjivaram Pure Mulberry Silk Saree in Emerald & Crimson Gold',
    brand: 'VAYYARI HERITAGE',
    category: 'saree',
    price: 18450,
    originalPrice: 24900,
    discountPercentage: 26,
    rating: 4.9,
    reviewCount: 124,
    inStock: true,
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80'
    ],
    swatches: [
      { id: 'sw-1', name: 'Emerald & Crimson Border', type: 'contrast', primaryHex: '#0B6623', secondaryHex: '#990000' },
      { id: 'sw-2', name: 'Dhup-Chhaon Peacock Blue', type: 'dhup_chhaon', primaryHex: '#003366', secondaryHex: '#008080' },
      { id: 'sw-3', name: 'Rani Pink & Mustard Gold', type: 'split', primaryHex: '#E0115F', secondaryHex: '#E5A100' }
    ],
    fabric: 'Pure Zari 3-Ply Mulberry Silk',
    weaveOrigin: 'Kanchipuram, Tamil Nadu (GI Tagged)',
    description: 'Master artisan handwoven Kanjivaram drape featuring interlocked korvai borders and intricate mayil (peacock) motifs in electroplated gold zari.',
    features: ['Silk Mark Certified', 'Handwoven 3-Ply Silk', 'Pure Gold Zari Pallu', 'Dry Clean Only']
  },
  {
    id: 'prod-banarasi-kadiyal',
    code: 'VY-BAN-08',
    title: 'Banarasi Kadiyal Georgette Silk with Meenakari Floral Jaal',
    brand: 'VAYYARI WEAVES',
    category: 'silk',
    price: 14200,
    originalPrice: 18500,
    discountPercentage: 23,
    rating: 4.8,
    reviewCount: 89,
    inStock: true,
    images: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80'
    ],
    swatches: [
      { id: 'sw-4', name: 'Gulabi Rose Meena', type: 'solid', primaryHex: '#C71585' },
      { id: 'sw-5', name: 'Sunlit Turmeric Gold', type: 'solid', primaryHex: '#FFC000' }
    ],
    fabric: 'Organza Silk with Resham Embroidery',
    weaveOrigin: 'Varanasi, Uttar Pradesh',
    description: 'Lightweight Kadiyal weave Banarasi drape with multidimensional meenakari florals and scalloped zari border.',
    features: ['Featherlight 420g Drape', 'Hand-dyed Natural Dyes', 'Includes Unstitched Blouse Piece']
  },
  {
    id: 'prod-chanderi-linen',
    code: 'VY-CHN-04',
    title: 'Chanderi Handspun Tissue Linen Saree with Silver Zari Bootee',
    brand: 'VAYYARI LIVING',
    category: 'saree',
    price: 6850,
    originalPrice: 8900,
    discountPercentage: 23,
    rating: 4.7,
    reviewCount: 65,
    inStock: true,
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80'
    ],
    swatches: [
      { id: 'sw-6', name: 'Ivory Shimmer', type: 'solid', primaryHex: '#FFFFF0' },
      { id: 'sw-7', name: 'Pista Green & Silver', type: 'contrast', primaryHex: '#93C572', secondaryHex: '#C0C0C0' }
    ],
    fabric: 'Linen Tissue Silk Blend',
    weaveOrigin: 'Chanderi, Madhya Pradesh',
    description: 'Breathable, sheer luxury tissue linen crafted for festive gatherings, day weddings, and heirloom collections.',
    features: ['Handcrafted Silver Bootee', 'Breathable Summer Weave', 'Authentic GI Certificate']
  },
  {
    id: 'prod-paithani-heritage',
    code: 'VY-PAI-02',
    title: 'Yeola Paithani Pure Silk with Asawali Border & Peacock Pallu',
    brand: 'VAYYARI LUXE',
    category: 'silk',
    price: 22500,
    originalPrice: 28000,
    discountPercentage: 20,
    rating: 5.0,
    reviewCount: 42,
    inStock: true,
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80'
    ],
    swatches: [
      { id: 'sw-8', name: 'Royal Purple & Green', type: 'contrast', primaryHex: '#4B0082', secondaryHex: '#008000' },
      { id: 'sw-9', name: 'Multicolor Kaleidoscope', type: 'grid', primaryHex: '#B22222', secondaryHex: '#FFD700' }
    ],
    fabric: '100% Mulberry Silk',
    weaveOrigin: 'Yeola, Maharashtra',
    description: 'Tapestry-woven heritage Paithani saree with an ornate peacock tapestry pallu that requires over 240 artisan hours to weave.',
    features: ['Heirloom Collectible', 'Double-sided Zari Pallu', 'Silk Mark Certified']
  }
];

export const mockCatalogService = {
  async getProducts(category?: string): Promise<StoreProduct[]> {
    await new Promise((r) => setTimeout(r, 400));
    if (!category || category === 'all') return MOCK_STORE_PRODUCTS;
    return MOCK_STORE_PRODUCTS.filter((p) => p.category === category);
  },

  async getProductById(id: string): Promise<StoreProduct | null> {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_STORE_PRODUCTS.find((p) => p.id === id) || null;
  }
};

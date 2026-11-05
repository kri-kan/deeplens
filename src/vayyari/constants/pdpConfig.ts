export type PdpSectionId =
  | 'color_variations'
  | 'frequently_bought'
  | 'specifications'
  | 'reviews'
  | 'similar_products'
  | 'you_may_like'
  | 'recently_viewed';

export interface PdpConfig {
  activeVariant?: 'control' | 'treatment' | 'custom';
  showRatings?: boolean;
  showViewsCount?: boolean;
  viewsCount?: number | string;
  descriptionDefaultCollapsed?: boolean;
  descriptionTruncateLines?: number;
  specsDefaultCollapsed?: boolean;
  specsShowSilkMark?: boolean;
  galleryThumbnailPosition?: 'in_container' | 'below_container';
  presentationMode?: 'grouped' | 'split';
  containerStyle?: 'cards' | 'borderless';
  visibleSections?: PdpSectionId[];
}

export const PDP_PRESETS: Record<'control' | 'treatment', PdpConfig> = {
  control: {
    activeVariant: 'control',
    showRatings: true,
    showViewsCount: false,
    viewsCount: '1.2k',
    descriptionDefaultCollapsed: false,
    descriptionTruncateLines: 2,
    specsDefaultCollapsed: false,
    specsShowSilkMark: true,
    galleryThumbnailPosition: 'in_container',
    presentationMode: 'grouped',
    containerStyle: 'cards',
    visibleSections: [
      'frequently_bought',
      'specifications',
      'reviews',
      'similar_products',
    ],
  },
  treatment: {
    activeVariant: 'treatment',
    showRatings: true,
    showViewsCount: true,
    viewsCount: '1.4k',
    descriptionDefaultCollapsed: true,
    descriptionTruncateLines: 2,
    specsDefaultCollapsed: true,
    specsShowSilkMark: true,
    galleryThumbnailPosition: 'in_container',
    presentationMode: 'grouped',
    containerStyle: 'cards',
    visibleSections: [
      'color_variations',
      'frequently_bought',
      'specifications',
      'reviews',
      'similar_products',
      'you_may_like',
      'recently_viewed',
    ],
  },
};

export const MOBILE_FLUSH_PRESET: PdpConfig = {
  activeVariant: 'custom',
  showRatings: true,
  showViewsCount: true,
  viewsCount: '1.4k',
  descriptionDefaultCollapsed: true,
  descriptionTruncateLines: 2,
  specsDefaultCollapsed: true,
  specsShowSilkMark: true,
  galleryThumbnailPosition: 'in_container',
  presentationMode: 'grouped',
  containerStyle: 'borderless',
  visibleSections: [
    'color_variations',
    'frequently_bought',
    'specifications',
    'reviews',
    'similar_products',
    'you_may_like',
    'recently_viewed',
  ],
};

export const DEFAULT_PDP_CONFIG: PdpConfig = MOBILE_FLUSH_PRESET;

export interface SampleStudioProduct {
  sku: string;
  title: string;
  brand: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  category: string;
  description: string;
  swatches: {
    id: string;
    label: string;
    colorHex: string;
    secondaryHex?: string;
  }[];
  specs: { label: string; value: string }[];
}

export const SAMPLE_PRODUCTS: Record<string, SampleStudioProduct> = {
  VF2B56: {
    sku: 'VF2B56',
    title: 'Kanjeevaram Pure Silk Gold Zari Saree',
    brand: 'VAANYA LUXE HERITAGE',
    price: 3299,
    originalPrice: 4999,
    discountPercent: 34,
    rating: 4.8,
    reviewCount: 248,
    category: 'Saree',
    description:
      'Woven by master artisans in Kanchipuram using pure mulberry silk yarn and certified 2-ply golden zari threads. Features traditional temple borders and rich floral pallu.',
    swatches: [
      { id: '1', label: 'Emerald Forest Gold', colorHex: '#1B4D3E', secondaryHex: '#D4AF37' },
      { id: '2', label: 'Ruby Crimson Rose', colorHex: '#9E1B32', secondaryHex: '#E25822' },
      { id: '3', label: 'Royal Sapphire Dusk', colorHex: '#0F52BA', secondaryHex: '#002366' },
    ],
    specs: [
      { label: 'Fabric Composition', value: '100% Pure Mulberry Silk' },
      { label: 'Weave Technique', value: 'Traditional Handloom Pitloom' },
      { label: 'Regional Craft Origin', value: 'Kanchipuram, Tamil Nadu' },
      { label: 'Zari / Inlay', value: 'Certified 2-Ply Gold Zari' },
      { label: 'Saree Length', value: '5.5 metres' },
      { label: 'Blouse Piece', value: '0.8 metres (Included Unstitched)' },
      { label: 'Preservation', value: 'Dry Clean Only, Muslin Bag Storage' },
    ],
  },
  VF2F4A: {
    sku: 'VF2F4A',
    title: 'Royal Anarkali Brocade Ensemble',
    brand: 'VAANYA HERITAGE',
    price: 4499,
    originalPrice: 6999,
    discountPercent: 36,
    rating: 4.9,
    reviewCount: 182,
    category: 'Dress',
    description:
      'Floor-length regal silhouette tailored from pure Chanderi silk with hand-embroidered zardozi neckline and floral brocade motifs.',
    swatches: [
      { id: '1', label: 'Plum Berry Gold', colorHex: '#4A154B', secondaryHex: '#D4AF37' },
      { id: '2', label: 'Sage Mint Silver', colorHex: '#8A9A86', secondaryHex: '#C0C0C0' },
    ],
    specs: [
      { label: 'Fabric Base', value: 'Pure Chanderi Silk' },
      { label: 'Embroidery Style', value: 'Handcrafted Zardozi & Resham Work' },
      { label: 'Lining Material', value: '100% Breathable Cotton Voile' },
      { label: 'Fit Profile', value: 'Flared Kalidar Anarkali Silhouette' },
    ],
  },
  VF2F4F: {
    sku: 'VF2F4F',
    title: 'Heritage Velvet Bridal Lehenga',
    brand: 'VAANYA LUXE',
    price: 8999,
    originalPrice: 13999,
    discountPercent: 36,
    rating: 5.0,
    reviewCount: 94,
    category: 'Lehenga',
    description:
      'Heirloom quality micro-velvet bridal lehenga hand-embellished with micro-pearls, dabka wirework, and heritage sequin borders.',
    swatches: [
      { id: '1', label: 'Bridal Crimson Gold', colorHex: '#800020', secondaryHex: '#FFD700' },
      { id: '2', label: 'Midnight Obsidian', colorHex: '#1C1D24', secondaryHex: '#E5E4E2' },
    ],
    specs: [
      { label: 'Fabric Composition', value: 'Premium Silk Micro-Velvet' },
      { label: 'Can-Can Underskirt', value: 'Double Layer Rigid Can-Can Included' },
      { label: 'Flare Diameter', value: '4.5 Metres Full Circle Flare' },
      { label: 'Dupatta Format', value: 'Dual Embroidered Organza Dupattas' },
    ],
  },
};

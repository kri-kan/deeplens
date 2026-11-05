import React from 'react';
import {
  LuCrown,
  LuSparkles,
  LuFeather,
  LuLayers,
  LuPalette,
  LuGem,
  LuLandmark,
  LuShield,
  LuShieldCheck,
  LuScissors,
  LuShirt,
  LuFlower2,
  LuSun,
  LuMoon,
  LuShoppingBag,
  LuStore,
  LuGift,
  LuTag,
  LuFlame,
  LuCoins,
  LuZap,
  LuHeart,
  LuStar,
  LuAward,
  LuCompass,
  LuBookmark,
  LuEye,
  LuShare2,
  LuPackage,
  LuPackagePlus,
  LuTruck,
  LuBarcode,
  LuCalendar,
  LuClock,
  LuPhone,
  LuMail,
  LuBell,
  LuLock,
  LuCamera,
  LuSearch,
  LuFilter,
  LuSlidersHorizontal,
  LuUser,
  LuUsers,
  LuCheck,
  LuCheckCheck,
  LuCircleCheck,
  LuTrendingUp,
} from 'react-icons/lu';

export interface SurveyCatalogIconItem {
  id: string;
  name: string;
  category: 'heritage' | 'store' | 'admin';
  render: (size: number, color?: string) => React.ReactNode;
}

export const SURVEY_ICON_CATALOG: Record<string, SurveyCatalogIconItem> = {
  // Heritage & Textile Craft
  crown: {
    id: 'crown',
    name: 'Crown (Royal Silk / Kanjeevaram)',
    category: 'heritage',
    render: (size, color) => <LuCrown size={size} color={color} />,
  },
  sparkles: {
    id: 'sparkles',
    name: 'Sparkles (Zari / Kadwa / Trending)',
    category: 'heritage',
    render: (size, color) => <LuSparkles size={size} color={color} />,
  },
  feather: {
    id: 'feather',
    name: 'Feather (Tissue Organza / Lightweight)',
    category: 'heritage',
    render: (size, color) => <LuFeather size={size} color={color} />,
  },
  layers: {
    id: 'layers',
    name: 'Layers (Chanderi Zari / Weft & Warp)',
    category: 'heritage',
    render: (size, color) => <LuLayers size={size} color={color} />,
  },
  palette: {
    id: 'palette',
    name: 'Palette (Tussar / Color Shades)',
    category: 'heritage',
    render: (size, color) => <LuPalette size={size} color={color} />,
  },
  gem: {
    id: 'gem',
    name: 'Gem (Paithani Brocade / Precious Weave)',
    category: 'heritage',
    render: (size, color) => <LuGem size={size} color={color} />,
  },
  landmark: {
    id: 'landmark',
    name: 'Landmark (Temple Border / Korvai)',
    category: 'heritage',
    render: (size, color) => <LuLandmark size={size} color={color} />,
  },
  shield: {
    id: 'shield',
    name: 'Shield (Authentic Handloom Certified)',
    category: 'heritage',
    render: (size, color) => <LuShield size={size} color={color} />,
  },
  'shield-check': {
    id: 'shield-check',
    name: 'Shield Check (Silk Mark Verified)',
    category: 'heritage',
    render: (size, color) => <LuShieldCheck size={size} color={color} />,
  },
  scissors: {
    id: 'scissors',
    name: 'Scissors (Bespoke Blouse Tailoring)',
    category: 'heritage',
    render: (size, color) => <LuScissors size={size} color={color} />,
  },
  shirt: {
    id: 'shirt',
    name: "Shirt (Men's Heritage Kurta / Dhoti)",
    category: 'heritage',
    render: (size, color) => <LuShirt size={size} color={color} />,
  },
  flower: {
    id: 'flower',
    name: 'Flower (Floral Kadwa / Butta Motifs)',
    category: 'heritage',
    render: (size, color) => <LuFlower2 size={size} color={color} />,
  },
  sun: {
    id: 'sun',
    name: 'Sun (Day Festive / Haldi / Pastels)',
    category: 'heritage',
    render: (size, color) => <LuSun size={size} color={color} />,
  },
  moon: {
    id: 'moon',
    name: 'Moon (Sangeet / Evening Dark Silk)',
    category: 'heritage',
    render: (size, color) => <LuMoon size={size} color={color} />,
  },

  // Store & Collection Curation
  'shopping-bag': {
    id: 'shopping-bag',
    name: 'Shopping Bag (Curated Cart)',
    category: 'store',
    render: (size, color) => <LuShoppingBag size={size} color={color} />,
  },
  store: {
    id: 'store',
    name: 'Store (Brand Boutique / Master Weaver)',
    category: 'store',
    render: (size, color) => <LuStore size={size} color={color} />,
  },
  gift: {
    id: 'gift',
    name: 'Gift (Wedding Trousseau / Festive Hamper)',
    category: 'store',
    render: (size, color) => <LuGift size={size} color={color} />,
  },
  tag: {
    id: 'tag',
    name: 'Tag (Collection Tag / Special Price)',
    category: 'store',
    render: (size, color) => <LuTag size={size} color={color} />,
  },
  flame: {
    id: 'flame',
    name: 'Flame (Signature Vayyari / Bestseller)',
    category: 'store',
    render: (size, color) => <LuFlame size={size} color={color} />,
  },
  coins: {
    id: 'coins',
    name: 'Coins (Mudras Loyalty Vault)',
    category: 'store',
    render: (size, color) => <LuCoins size={size} color={color} />,
  },
  zap: {
    id: 'zap',
    name: 'Zap (Flash Drop / Express Dispatch)',
    category: 'store',
    render: (size, color) => <LuZap size={size} color={color} />,
  },
  heart: {
    id: 'heart',
    name: 'Heart (Customer Favorite / Wishlist)',
    category: 'store',
    render: (size, color) => <LuHeart size={size} color={color} />,
  },
  star: {
    id: 'star',
    name: 'Star (Top-Rated Masterpiece)',
    category: 'store',
    render: (size, color) => <LuStar size={size} color={color} />,
  },
  award: {
    id: 'award',
    name: 'Award (Weaver Guild Honors)',
    category: 'store',
    render: (size, color) => <LuAward size={size} color={color} />,
  },
  compass: {
    id: 'compass',
    name: 'Compass (Taste Discovery)',
    category: 'store',
    render: (size, color) => <LuCompass size={size} color={color} />,
  },
  bookmark: {
    id: 'bookmark',
    name: 'Bookmark (Saved Edit / Lookbook)',
    category: 'store',
    render: (size, color) => <LuBookmark size={size} color={color} />,
  },
  eye: {
    id: 'eye',
    name: 'Eye (Drape Preview / High Res)',
    category: 'store',
    render: (size, color) => <LuEye size={size} color={color} />,
  },
  share: {
    id: 'share',
    name: 'Share (Social Collab / Stylist Advice)',
    category: 'store',
    render: (size, color) => <LuShare2 size={size} color={color} />,
  },

  // Admin, Order & Operations
  package: {
    id: 'package',
    name: 'Package (Luxury Box Packaging)',
    category: 'admin',
    render: (size, color) => <LuPackage size={size} color={color} />,
  },
  'package-plus': {
    id: 'package-plus',
    name: 'Package Plus (Order Add-on)',
    category: 'admin',
    render: (size, color) => <LuPackagePlus size={size} color={color} />,
  },
  truck: {
    id: 'truck',
    name: 'Truck (Nationwide Dispatch / Delivery)',
    category: 'admin',
    render: (size, color) => <LuTruck size={size} color={color} />,
  },
  barcode: {
    id: 'barcode',
    name: 'Barcode (Inventory SKU / Piece Tracking)',
    category: 'admin',
    render: (size, color) => <LuBarcode size={size} color={color} />,
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar (Muhurtham Date Planner)',
    category: 'admin',
    render: (size, color) => <LuCalendar size={size} color={color} />,
  },
  clock: {
    id: 'clock',
    name: 'Clock (Limited Edition Countdown)',
    category: 'admin',
    render: (size, color) => <LuClock size={size} color={color} />,
  },
  phone: {
    id: 'phone',
    name: 'Phone (WhatsApp Stylist Concierge)',
    category: 'admin',
    render: (size, color) => <LuPhone size={size} color={color} />,
  },
  mail: {
    id: 'mail',
    name: 'Mail (Order & VIP Confirmation)',
    category: 'admin',
    render: (size, color) => <LuMail size={size} color={color} />,
  },
  bell: {
    id: 'bell',
    name: 'Bell (Drop & Back-in-Stock Alert)',
    category: 'admin',
    render: (size, color) => <LuBell size={size} color={color} />,
  },
  lock: {
    id: 'lock',
    name: 'Lock (Private Vault / Confidential)',
    category: 'admin',
    render: (size, color) => <LuLock size={size} color={color} />,
  },
  camera: {
    id: 'camera',
    name: 'Camera (Studio Photoshoot)',
    category: 'admin',
    render: (size, color) => <LuCamera size={size} color={color} />,
  },
  search: {
    id: 'search',
    name: 'Search (Weave & Motif Explorer)',
    category: 'admin',
    render: (size, color) => <LuSearch size={size} color={color} />,
  },
  filter: {
    id: 'filter',
    name: 'Filter (Fabric & Occasion Filters)',
    category: 'admin',
    render: (size, color) => <LuFilter size={size} color={color} />,
  },
  sliders: {
    id: 'sliders',
    name: 'Sliders (Custom Preference Controls)',
    category: 'admin',
    render: (size, color) => <LuSlidersHorizontal size={size} color={color} />,
  },
  user: {
    id: 'user',
    name: 'User (Client Passport Profile)',
    category: 'admin',
    render: (size, color) => <LuUser size={size} color={color} />,
  },
  users: {
    id: 'users',
    name: 'Users (Bridal Couple & Family)',
    category: 'admin',
    render: (size, color) => <LuUsers size={size} color={color} />,
  },
  check: {
    id: 'check',
    name: 'Check (Selected Item)',
    category: 'admin',
    render: (size, color) => <LuCheck size={size} color={color} />,
  },
  'check-circle': {
    id: 'check-circle',
    name: 'Circle Check (Verified QC)',
    category: 'admin',
    render: (size, color) => <LuCircleCheck size={size} color={color} />,
  },
  'check-check': {
    id: 'check-check',
    name: 'Check Check (Delivered & Verified)',
    category: 'admin',
    render: (size, color) => <LuCheckCheck size={size} color={color} />,
  },
  'trending-up': {
    id: 'trending-up',
    name: 'Trending Up (Demand Surge)',
    category: 'admin',
    render: (size, color) => <LuTrendingUp size={size} color={color} />,
  },
};

export const SURVEY_ICON_IDS = Object.keys(SURVEY_ICON_CATALOG);

export function getVectorIcon(
  id: string = 'crown',
  size: number = 36,
  color?: string
): React.ReactNode {
  const item = SURVEY_ICON_CATALOG[id] || SURVEY_ICON_CATALOG.crown;
  return item.render(size, color);
}

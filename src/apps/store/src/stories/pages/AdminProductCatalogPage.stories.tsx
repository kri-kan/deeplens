import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminProductCatalogPage,
  AdminProductCatalogPageProps,
} from '../../components/pages/AdminProductCatalogPage';
import { ProductGridTileData } from '../../components/molecules/ProductGridTile';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Mock Catalog Data
// ─────────────────────────────────────────────

const MOCK_PRODUCTS: ProductGridTileData[] = [
  {
    id: 'sku-001',
    productCode: 'SAR-KAN-901',
    title: 'Kanjivaram Silk Saree',
    price: 8499,
    category: 'saree',
    imageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80',
    isStarred: true,
    timeAgo: '12m ago',
  },
  {
    id: 'sku-002',
    productCode: 'SAR-BAN-402',
    title: 'Banarasi Zari Tissue',
    price: 11200,
    category: 'saree',
    imageUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&q=80',
    isStarred: false,
    timeAgo: '45m ago',
  },
  {
    id: 'sku-003',
    productCode: 'DRS-ANA-103',
    title: 'Floor Length Anarkali Gown',
    price: 4599,
    category: 'dress',
    imageUri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80',
    isStarred: true,
    timeAgo: '2h ago',
  },
  {
    id: 'sku-004',
    productCode: 'LEH-BRD-504',
    title: 'Crimson Velvet Bridal Lehanga',
    price: 18500,
    category: 'lehanga',
    imageUri: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80',
    isStarred: true,
    timeAgo: '3h ago',
  },
  {
    id: 'sku-005',
    productCode: 'KID-KUR-205',
    title: 'Boys Silk Kurta Pajama',
    price: 1899,
    category: 'kids',
    imageUri: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&q=80',
    isStarred: false,
    timeAgo: '5h ago',
  },
  {
    id: 'sku-006',
    productCode: 'SAR-COT-306',
    title: 'Handloom Chanderi Cotton',
    price: 2650,
    category: 'saree',
    imageUri: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=400&q=80',
    isStarred: false,
    timeAgo: '1d ago',
  },
  {
    id: 'sku-007',
    productCode: 'DRS-MAX-707',
    title: 'Floral Georgette Maxi Dress',
    price: 3200,
    category: 'dress',
    imageUri: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80',
    isStarred: false,
    timeAgo: '1d ago',
  },
  {
    id: 'sku-008',
    productCode: 'GEN-DUP-808',
    title: 'Phulkari Embroidered Dupatta',
    price: 1450,
    category: 'general',
    imageUri: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=400&q=80',
    isStarred: true,
    timeAgo: '2d ago',
  },
  {
    id: 'sku-009',
    productCode: 'LEH-PAS-909',
    title: 'Pastel Mint Party Lehanga',
    price: 14200,
    category: 'lehanga',
    imageUri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&q=80',
    isStarred: false,
    timeAgo: '3d ago',
  },
];

// ─────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────

type StoryProps = AdminProductCatalogPageProps & { campaign?: string; mode?: string };

const meta: Meta<StoryProps> = {
  title: 'Pages/Admin/ProductCatalog',
  component: AdminProductCatalogPage,
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    products: MOCK_PRODUCTS,
    activeCategoryId: 'all',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    disableSafeArea: {
      control: 'boolean',
      description: 'Disable safe area insets (useful inside mock device frames)',
    },
    isLoading: {
      control: 'boolean',
      description: 'Toggle loading skeleton state',
    },
    columns: {
      control: { type: 'number', min: 2, max: 5 },
      description: 'Number of columns in responsive grid',
    },
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

// ─────────────────────────────────────────────
// 7-State Stories
// ─────────────────────────────────────────────

/**
 * 1. Populated State: Standard 3-column mobile product catalog grid.
 */
export const Populated: Story = {
  name: '1. Populated 3-Col Catalog',
  decorators: [withFormFactor('mobile', 'Product Catalog - Populated')],
  args: {
    disableSafeArea: true,
    products: MOCK_PRODUCTS,
    activeCategoryId: 'all',
    isLoading: false,
  },
};

/**
 * 2. Empty State: No catalog products found or zero search results.
 */
export const Empty: Story = {
  name: '2. Empty State (No SKUs)',
  decorators: [withFormFactor('mobile', 'Product Catalog - Empty')],
  args: {
    disableSafeArea: true,
    products: [],
    searchQuery: 'NonExistentProduct',
    isLoading: false,
  },
};

/**
 * 3. Loading State: Skeleton shimmer tiles while fetching catalog data.
 */
export const Loading: Story = {
  name: '3. Loading State (Skeletons)',
  decorators: [withFormFactor('mobile', 'Product Catalog - Loading')],
  args: {
    disableSafeArea: true,
    products: [],
    isLoading: true,
  },
};

/**
 * 4. Multi-Selection Mode: Items selected with floating batch action bar visible.
 */
export const MultiSelectionMode: Story = {
  name: '4. Batch Selection Mode',
  decorators: [withFormFactor('mobile', 'Product Catalog - Selection Mode')],
  args: {
    disableSafeArea: true,
    products: MOCK_PRODUCTS,
  },
};

/**
 * 5. Filtered State: Active filters with filter chips bar and counter badge.
 */
export const FilteredResults: Story = {
  name: "5. Filtered (Starred & Sarees)",
  decorators: [withFormFactor("mobile", "Product Catalog - Filtered")],
  args: {
    disableSafeArea: true,
    products: [
      MOCK_PRODUCTS[0],
      {
        id: "sku-010",
        productCode: "SAR-PAT-110",
        title: "Patan Patola Double Ikat",
        price: 13500,
        category: "saree",
        imageUri: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&q=80",
        isStarred: true,
        timeAgo: "4h ago",
      },
      {
        id: "sku-011",
        productCode: "SAR-KAN-111",
        title: "Pure Mysore Silk Saree",
        price: 7200,
        category: "saree",
        imageUri: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=400&q=80",
        isStarred: true,
        timeAgo: "1d ago",
      },
    ],
    activeCategoryId: "saree",
    activeFilterCount: 3,
    filterChips: [
      { id: "f-star", label: "⭐ Starred Only" },
      { id: "f-price", label: "💰 ₹5,000 - ₹15,000" },
      { id: "f-date", label: "📅 Last 7 Days" },
    ],
  },
};

/**
 * 6. Quick Edit Sheet: Demonstrates inline SKU price & category modification.
 */

/**
 * 6. Left Filter Pane Open: Two-panel left drawer with Sort, Starred, Category, Price, Fabric, Vendor, and Status tabs.
 */
export const FilterDrawerOpen: Story = {
  name: "6. Left Filter Pane Open",
  decorators: [withFormFactor("mobile", "Product Catalog - Left Filter Pane")],
  args: {
    disableSafeArea: true,
    isFilterDrawerOpen: true,
    products: MOCK_PRODUCTS,
  },
};

export const QuickEditSheetActive: Story = {
  name: '6. Quick Edit Bottom Sheet',
  decorators: [withFormFactor('mobile', 'Product Catalog - Quick Edit')],
  args: {
    disableSafeArea: true,
    products: MOCK_PRODUCTS,
  },
};

/**
 * 7. Theme Switching: Validation across 5 campaigns (Luxe, Valentine, Summer, Black Friday, Ramadan).
 */
export const ThemeCampaignLuxe: Story = {
  name: '7a. Theme - Luxe (Gold/Dark)',
  decorators: [withFormFactor('mobile', 'Product Catalog - Luxe Campaign')],
  args: {
    disableSafeArea: true,
    campaign: 'luxe',
    mode: 'dark',
    products: MOCK_PRODUCTS,
  },
};

export const ThemeCampaignValentine: Story = {
  name: '7b. Theme - Valentine (Rose)',
  decorators: [withFormFactor('mobile', 'Product Catalog - Valentine Campaign')],
  args: {
    disableSafeArea: true,
    campaign: 'valentine',
    mode: 'light',
    products: MOCK_PRODUCTS,
  },
};

export const ThemeCampaignBlackFriday: Story = {
  name: '7c. Theme - Black Friday (Neon)',
  decorators: [withFormFactor('mobile', 'Product Catalog - Black Friday Campaign')],
  args: {
    disableSafeArea: true,
    campaign: 'blackfriday',
    mode: 'dark',
    products: MOCK_PRODUCTS,
  },
};

export const ThemeCampaignSummer: Story = {
  name: '7d. Theme - Summer (Warm Teal)',
  decorators: [withFormFactor('mobile', 'Product Catalog - Summer Campaign')],
  args: {
    disableSafeArea: true,
    campaign: 'summer',
    mode: 'light',
    products: MOCK_PRODUCTS,
  },
};

export const ThemeCampaignRamadan: Story = {
  name: '7e. Theme - Ramadan (Emerald)',
  decorators: [withFormFactor('mobile', 'Product Catalog - Ramadan Campaign')],
  args: {
    disableSafeArea: true,
    campaign: 'ramadan',
    mode: 'dark',
    products: MOCK_PRODUCTS,
  },
};

/**
 * Tablet Viewport: 4-5 column responsive grid layout.
 */
export const TabletViewport: Story = {
  name: '8. Tablet / Wide 4-Column Grid',
  decorators: [withFormFactor('tablet', 'Product Catalog - Tablet')],
  args: {
    disableSafeArea: true,
    columns: 4,
    products: [...MOCK_PRODUCTS, ...MOCK_PRODUCTS],
  },
};

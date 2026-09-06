import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminProductDetailPage,
  AdminProductDetailData,
  AdminProductDetailPageProps,
} from '../../components/pages/AdminProductDetailPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const MOCK_MEDIA = [
  {
    id: 'med-1',
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&auto=format&fit=crop&q=80',
    mediaType: 'image' as const,
    isDefault: true,
  },
  {
    id: 'med-2',
    url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80',
    mediaType: 'image' as const,
  },
  {
    id: 'med-3',
    url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=900&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300&auto=format&fit=crop&q=80',
    mediaType: 'video' as const,
  },
  {
    id: 'med-4',
    url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=900&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=300&auto=format&fit=crop&q=80',
    mediaType: 'image' as const,
  },
];

const MOCK_LISTINGS = [
  {
    id: 'lst-1',
    vendorName: 'Varanasi Weavers Syndicate',
    price: 3850,
    currency: 'INR',
    isActive: true,
    isPlusShipping: false,
    updatedAt: 'Today, 2:45 PM',
    description: 'Pure Katan Silk Handloom Banarasi saree in vibrant rani pink with electroplated gold zari border. Includes 0.8m running unstitched blouse.',
    sourceGroupId: '1203630481920@g.us',
    sourceJid: '919876543210@s.whatsapp.net',
  },
  {
    id: 'lst-2',
    vendorName: 'Surat Wholesale Hub',
    price: 3499,
    currency: 'INR',
    isActive: false,
    isPlusShipping: true,
    updatedAt: 'Yesterday, 6:10 PM',
    description: 'Semi-katan silk replica weave, identical pallu design with fast dyes. Bulk booking available with extra 50 shipping per parcel.',
    sourceGroupId: '1203630981123@g.us',
    sourceJid: '919123456780@s.whatsapp.net',
  },
];

const MOCK_PRODUCT: AdminProductDetailData = {
  id: 'PRD-88219',
  title: 'Katan Silk Banarasi Saree in Rani Pink with Gold Zari',
  productCode: 'VAY-SA-8821',
  vendorPrice: 3850,
  category: 'saree',
  fabric: 'Pure Katan Silk',
  timestamp: 'Aug 26, 2:45 PM',
  exclusiveDescription: 'Handcrafted luxury Banarasi drape featuring antique gold floral bootas across the body and heavy bridal kadhwa border. Sourced directly via WhatsApp artisan intake.',
  isArchived: false,
  media: MOCK_MEDIA,
  listings: MOCK_LISTINGS,
};

// ─────────────────────────────────────────────
// Meta Definition
// ─────────────────────────────────────────────

type StoryProps = AdminProductDetailPageProps & { campaign?: string; colorScheme?: string; mode?: string };

const meta: Meta<StoryProps> = {
  title: 'Pages/Admin/ProductDetail',
  component: AdminProductDetailPage,
  args: {
    ...THEME_ARGS,
    product: MOCK_PRODUCT,
    disableSafeArea: false,
    isLoading: false,
    initialViewMode: 'carousel',
    initialListingSheetOpen: false,
    initialEditSheetOpen: false,
    initialDeleteDialogOpen: false,
    onBack: () => alert('Back pressed'),
    onFindSimilar: () => alert('Navigating to similar matches'),
    onShare: () => alert('Sharing product details'),
    onStarMedia: (id) => alert(`Starred media ${id}`),
    onReevaluateLLM: () => alert('Re-evaluating with AI vision pipeline'),
    onDeleteProduct: () => alert('Product deleted'),
    onUnarchive: () => alert('Product unarchived and restored to active catalog'),
    onSaveMetadata: (updates) => alert(`Metadata updated: ${JSON.stringify(updates)}`),
    onOpenWhatsAppListing: (l) => alert(`Opening chat with ${l.vendorName}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<StoryProps>;

// ─────────────────────────────────────────────
// 7-State UI Validation Stories
// ─────────────────────────────────────────────

/**
 * 1. Default: Full Active Product Detail
 * Shows carousel with media items, price tag, SKU code, IST timestamp,
 * category pill, description, and active vendor listings.
 */
export const Default: Story = {
  name: '1. Default Active Product',
  decorators: [withFormFactor('mobile', 'Product Detail (Active)')],
  args: {},
};

/**
 * 2. Single Image: Product with only 1 photo
 * Verifies that paging dots hide cleanly when only 1 image exists,
 * and single vendor listing displays smoothly.
 */
export const SingleImage: Story = {
  name: '2. Single Image Only',
  decorators: [withFormFactor('mobile', 'Product Detail (Single Image)')],
  args: {
    product: {
      ...MOCK_PRODUCT,
      id: 'PRD-10291',
      title: 'Chanderi Cotton Printed Kurti',
      productCode: 'VAY-DR-1029',
      vendorPrice: 1250,
      category: 'dress',
      fabric: 'Chanderi Cotton',
      media: [MOCK_MEDIA[0]],
      listings: [MOCK_LISTINGS[0]],
    },
  },
};

/**
 * 3. Grid Gallery View Mode
 * Verifies that tapping the view mode toggle switches presentation
 * into an edge-to-edge 3-column media grid.
 */
export const GridGalleryMode: Story = {
  name: '3. Grid Gallery Mode',
  decorators: [withFormFactor('mobile', 'Product Detail (Gallery Mode)')],
  args: {
    initialViewMode: 'gallery',
  },
};

/**
 * 4. Archived State
 * Verifies the prominent amber warning banner with the "Restore"
 * action button when product is marked archived.
 */
export const ArchivedState: Story = {
  name: '4. Archived Product',
  decorators: [withFormFactor('mobile', 'Product Detail (Archived)')],
  args: {
    product: {
      ...MOCK_PRODUCT,
      isArchived: true,
    },
  },
};

/**
 * 5. Vendor Listing Sheet Open
 * Shows slide-up bottom sheet with raw vendor description, price,
 * free shipping status, and direct WhatsApp source chat link.
 */
export const VendorListingSheetOpen: Story = {
  name: '5. Vendor Listing Sheet Open',
  decorators: [withFormFactor('mobile', 'Product Detail (Listing Sheet)')],
  args: {
    initialListingSheetOpen: true,
  },
};

/**
 * 6. Edit Metadata Sheet Open
 * Shows price input, category selector chips, fabric input,
 * and AI training inclusion switch.
 */
export const EditMetadataSheetOpen: Story = {
  name: '6. Edit Metadata Sheet Open',
  decorators: [withFormFactor('mobile', 'Product Detail (Edit Sheet)')],
  args: {
    initialEditSheetOpen: true,
  },
};

/**
 * 7. Loading Skeleton State
 * Displays skeleton placeholders while details & high-res media fetch.
 */
export const LoadingState: Story = {
  name: '7. Loading Skeleton',
  decorators: [withFormFactor('mobile', 'Product Detail (Loading)')],
  args: {
    isLoading: true,
  },
};

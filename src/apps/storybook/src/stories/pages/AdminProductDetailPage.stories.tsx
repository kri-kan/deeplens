import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminProductDetailPage,
  AdminProductDetailData,
  AdminProductDetailPageProps,
} from '../../components/pages/AdminProductDetailPage';
import { MediaSlideItem } from '../../components/molecules/AdminProductMediaCarousel';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { DIVERSE_CATALOG_PRODUCTS, CatalogTestProduct } from '../../data/catalog';

// ─────────────────────────────────────────────
// Authentic Catalog Data Helpers
// ─────────────────────────────────────────────

export function toAdminProductDetail(product: CatalogTestProduct): AdminProductDetailData {
  const media: MediaSlideItem[] = [];
  const seenUrls = new Set<string>();

  // Collect from swatches first
  Object.values(product.swatches).forEach((swatch) => {
    swatch.images?.forEach((img) => {
      if (img.url && !seenUrls.has(img.url)) {
        seenUrls.add(img.url);
        media.push({
          id: `med-${media.length + 1}`,
          url: img.url,
          thumbnailUrl: img.url,
          mediaType: 'image',
          isDefault: media.length === 0,
        });
      }
    });
  });

  // Collect from mediaGallery
  product.mediaGallery.forEach((url) => {
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      media.push({
        id: `med-${media.length + 1}`,
        url,
        thumbnailUrl: url,
        mediaType: 'image',
        isDefault: media.length === 0,
      });
    }
  });

  return {
    id: product.id,
    title: product.title,
    productCode: product.sku,
    vendorPrice: product.price,
    category: product.category,
    fabric: product.fabric,
    timestamp: 'Today, 2:45 PM',
    exclusiveDescription: product.description,
    isArchived: false,
    media,
    listings: [
      {
        id: `lst-${product.sku}-1`,
        vendorName: product.brand || 'Varanasi Weavers Syndicate',
        price: product.price,
        currency: 'INR',
        isActive: true,
        isPlusShipping: false,
        updatedAt: 'Today, 2:45 PM',
        description: product.description,
        sourceGroupId: '1203630481920@g.us',
        sourceJid: '919876543210@s.whatsapp.net',
      },
      {
        id: `lst-${product.sku}-2`,
        vendorName: 'Surat Wholesale Hub',
        price: Math.round(product.price * 0.95),
        currency: 'INR',
        isActive: false,
        isPlusShipping: true,
        updatedAt: 'Yesterday, 6:10 PM',
        description: `${product.title} - Bulk lots available, fast dispatch directly from Surat wholesale market.`,
        sourceGroupId: '1203630981123@g.us',
        sourceJid: '919123456780@s.whatsapp.net',
      },
    ],
  };
}

const SAREE_PRODUCT = toAdminProductDetail(DIVERSE_CATALOG_PRODUCTS[0]); // VF2B56 Banarasi Silk Saree (10 real images)
const BLOUSE_PRODUCT = toAdminProductDetail(DIVERSE_CATALOG_PRODUCTS[1]); // VF189B Brocade Blouse
const DRESS_PRODUCT = toAdminProductDetail(DIVERSE_CATALOG_PRODUCTS[2]); // VF2F4A Anarkali Suit Set (3 real images)
const KIDS_PRODUCT = toAdminProductDetail(DIVERSE_CATALOG_PRODUCTS[3]); // VF46D Kids Lehenga Choli (2 real images)
const LEHENGA_PRODUCT = toAdminProductDetail(DIVERSE_CATALOG_PRODUCTS[4]); // VF2F4F Vichitra Silk Lehenga (2 real images)

// ─────────────────────────────────────────────
// Meta Definition
// ─────────────────────────────────────────────

type StoryProps = AdminProductDetailPageProps & { campaign?: string; colorScheme?: string; mode?: string };

const meta: Meta<StoryProps> = {
  title: 'Pages/Admin/ProductDetail',
  component: AdminProductDetailPage,
  args: {
    ...THEME_ARGS,
    product: SAREE_PRODUCT,
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
 * Shows carousel with authentic media items, price tag, SKU code, IST timestamp,
 * category pill, description, and active vendor listings.
 */
export const Default: Story = {
  name: '1. Default Active Product',
  decorators: [withFormFactor('mobile', 'Product Detail (Active - VF2B56)')],
  args: {
    product: SAREE_PRODUCT,
  },
};

/**
 * 2. Single Image: Product with only 1 photo
 * Verifies that paging dots hide cleanly when only 1 image exists,
 * and single vendor listing displays smoothly.
 */
export const SingleImage: Story = {
  name: '2. Single Image Only',
  decorators: [withFormFactor('mobile', 'Product Detail (Single Image - VF2F4A)')],
  args: {
    product: {
      ...DRESS_PRODUCT,
      id: 'PRD-SINGLE-IMAGE',
      media: [DRESS_PRODUCT.media![0]],
      listings: [DRESS_PRODUCT.listings![0]],
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
    product: SAREE_PRODUCT,
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
      ...SAREE_PRODUCT,
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
    product: SAREE_PRODUCT,
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
    product: SAREE_PRODUCT,
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

// ─────────────────────────────────────────────
// Authentic Catalog Category Variations
// ─────────────────────────────────────────────

export const KidsEthnicWear: Story = {
  name: 'Kids Ethnic Wear (VF46D)',
  decorators: [withFormFactor('mobile', 'Kids Ethnic - VF46D')],
  args: {
    product: KIDS_PRODUCT,
  },
};

export const AnarkaliSuit: Story = {
  name: 'Anarkali Dress Suit (VF2F4A)',
  decorators: [withFormFactor('mobile', 'Anarkali Suit - VF2F4A')],
  args: {
    product: DRESS_PRODUCT,
  },
};

export const BridalLehenga: Story = {
  name: 'Bridal Lehenga (VF2F4F)',
  decorators: [withFormFactor('mobile', 'Bridal Lehenga - VF2F4F')],
  args: {
    product: LEHENGA_PRODUCT,
  },
};

export const BrocadeBlouse: Story = {
  name: 'Brocade Blouse (VF189B)',
  decorators: [withFormFactor('mobile', 'Brocade Blouse - VF189B')],
  args: {
    product: BLOUSE_PRODUCT,
  },
};

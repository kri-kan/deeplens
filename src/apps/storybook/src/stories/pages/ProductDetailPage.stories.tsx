import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ProductDetailPage, PDP_PRESETS, MOBILE_FLUSH_PRESET } from '../../components/pages/ProductDetailPage';
import { DIVERSE_CATALOG_PRODUCTS, getProductBySku } from '../../data/catalog';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Store/ProductDetail',
  component: ProductDetailPage,
  args: {
    ...THEME_ARGS,
    product: DIVERSE_CATALOG_PRODUCTS[0],
    onNavigateHome: () => alert('Navigating to Home'),
    onAddToCart: (p: any) => alert(`Added ${p.title} to bag!`),
    onNavigateCatalog: () => alert('Navigating to Catalog'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof ProductDetailPage>;

export const InteractiveFormFactors: Story = {
  render: (args) => <ProductDetailPage {...args} />,
};

/**
 * Authentic Catalog Category Stories
 */
export const KanjeevaramSaree: Story = {
  name: 'Saree: VF2B56 (Free Size & Swatches)',
  decorators: [withFormFactor('mobile', 'VF2B56 Kanjeevaram Silk Saree')],
  args: {
    product: getProductBySku('VF2B56') || DIVERSE_CATALOG_PRODUCTS[0],
  },
};

export const AnarkaliDress: Story = {
  name: 'Dress: VF2F4A (Letter Sizes XS-3XL)',
  decorators: [withFormFactor('mobile', 'VF2F4A Anarkali Dress')],
  args: {
    product: getProductBySku('VF2F4A') || DIVERSE_CATALOG_PRODUCTS[1],
  },
};

export const KidsPattuPavadai: Story = {
  name: 'Kids: VF46D (Age & Number Sizes 16-36)',
  decorators: [withFormFactor('mobile', 'VF46D Kids Pattu Pavadai')],
  args: {
    product: getProductBySku('VF46D') || DIVERSE_CATALOG_PRODUCTS[2],
  },
};

export const BridalLehenga: Story = {
  name: 'Lehenga: VF2F4F (Free Size Semi-Stitched)',
  decorators: [withFormFactor('mobile', 'VF2F4F Bridal Velvet Lehenga')],
  args: {
    product: getProductBySku('VF2F4F') || DIVERSE_CATALOG_PRODUCTS[3],
  },
};

/**
 * Grouped PDP View (Multi-Swatch with Dynamic Media Filtering & Mandatory Selection):
 * Demonstrates:
 * 1. Tapping a color swatch filters gallery to only that color's photos.
 * 2. Tapping the active swatch unselects it, revealing all media across swatches.
 * 3. Tapping 'Add to Bag' when unselected opens the Myntra-style bottom sheet.
 */
export const GroupedPDPViewInteractive: Story = {
  name: 'Presentation: Grouped PDP (Multi-Swatch, Toggle Filter & Mandatory Sheet)',
  decorators: [withFormFactor('mobile', 'Grouped PDP · VF2B56')],
  args: {
    product: getProductBySku('VF2B56') || DIVERSE_CATALOG_PRODUCTS[0],
    presentationMode: 'grouped',
  },
};

/**
 * Split PDP View (Single-SKU Spotlight with Sibling SKUs Strip):
 * Demonstrates:
 * 1. Single swatch presented for this dedicated SKU.
 * 2. Header pill: 'Available in 3 other colorways'.
 * 3. Dedicated 'Color Variations in this Saree' row placed above 'You May Also Cherish'
 *    with direct links to sibling SKU PDPs.
 */
export const SplitPDPSingleSwatchWithSiblingStrip: Story = {
  name: 'Presentation: Split PDP (Single Swatch & Sibling SKUs Row)',
  decorators: [withFormFactor('mobile', 'Split SKU PDP · VF2B5601')],
  args: {
    product: getProductBySku('VF2B56') || DIVERSE_CATALOG_PRODUCTS[0],
    presentationMode: 'split',
  },
};

/**
 * A/B Testing Experiment Stories:
 */
export const VariantAControl: Story = {
  name: 'Experiment: Variant A (Control - Classic Heritage)',
  decorators: [withFormFactor('mobile', 'Variant A (Control)')],
  args: {
    product: getProductBySku('VF2B56') || DIVERSE_CATALOG_PRODUCTS[0],
    config: PDP_PRESETS.control,
  },
};

export const VariantBTreatment: Story = {
  name: 'Experiment: Variant B (Treatment - Social Proof & Compact Merchandising)',
  decorators: [withFormFactor('mobile', 'Variant B (Treatment)')],
  args: {
    product: getProductBySku('VF2B56') || DIVERSE_CATALOG_PRODUCTS[0],
    config: PDP_PRESETS.treatment,
  },
};

export const VariantCMobileFlush: Story = {
  name: 'Experiment: Variant C (Mobile Flush - Borderless Edge-to-Edge)',
  decorators: [withFormFactor('mobile', 'Variant C (Mobile Flush)')],
  args: {
    product: getProductBySku('VF2B56') || DIVERSE_CATALOG_PRODUCTS[0],
    config: MOBILE_FLUSH_PRESET,
  },
};

/**
 * Side-by-Side Mobile Layout Comparison Stories:
 * Compare Boxed Cards (16px gutters) vs Borderless Flush (edge-to-edge).
 */
export const ComparisonMobileBoxedCards: Story = {
  name: 'Mobile Layout: 1. Boxed Cards (16px Gutters)',
  decorators: [withFormFactor('mobile', 'Boxed Cards (16px Gutters)')],
  args: {
    product: getProductBySku('VF2B56') || DIVERSE_CATALOG_PRODUCTS[0],
    config: {
      ...PDP_PRESETS.treatment,
      containerStyle: 'cards',
    },
  },
};

export const ComparisonMobileBorderlessFlush: Story = {
  name: 'Mobile Layout: 2. Borderless Flush (Reclaim Lateral Margin)',
  decorators: [withFormFactor('mobile', 'Borderless Flush (Edge-to-Edge)')],
  args: {
    product: getProductBySku('VF2B56') || DIVERSE_CATALOG_PRODUCTS[0],
    config: {
      ...PDP_PRESETS.treatment,
      containerStyle: 'borderless',
    },
  },
};

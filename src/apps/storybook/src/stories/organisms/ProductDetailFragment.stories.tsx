import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ProductDetailFragment } from '../../components/organisms/ProductDetailFragment';
import { DIVERSE_CATALOG_PRODUCTS } from '../../data/catalog';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const sampleProduct = {
  id: 'vf2b56',
  code: 'VF2B56',
  sku: 'VF2B56',
  title: 'Kanjeevaram Silk Saree with Temple Border',
  brand: 'VAANYA LUXE',
  category: 'Kanjeevaram Sarees',
  fabric: 'Pure Mulberry Silk',
  weaveOrigin: 'Kanchipuram, Tamil Nadu',
  description:
    'Handwoven pure mulberry silk saree featuring traditional Korvai temple borders, pure gold zari brocade motifs, and contrast pallu. Handloomed by master weavers with Silk Mark certification.',
  price: 4999,
  originalPrice: 7999,
  discountPercent: 37,
  rating: 4.8,
  reviewCount: 248,
  inStock: true,
  stockQuantity: 12,
  colorGroups: [
    {
      id: 'maroon-gold',
      name: 'Crimson Maroon & Antique Gold',
      template: 'contrast-border' as any,
      slotA: '#800000',
      slotB: '#D4AF37',
      colors: ['#800000', '#D4AF37'],
      colorCount: 2,
    },
    {
      id: 'peacock-teal',
      name: 'Peacock Blue & Mustard',
      template: 'multi-tone' as any,
      slotA: '#005F73',
      slotB: '#EE9B00',
      colors: ['#005F73', '#EE9B00'],
      colorCount: 2,
    },
    {
      id: 'emerald-pink',
      name: 'Emerald Green & Rani Pink',
      template: 'solid' as any,
      slotA: '#1B4D3E',
      slotB: '#DB2777',
      colors: ['#1B4D3E', '#DB2777'],
      colorCount: 2,
    },
  ],
  images: [
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=80',
  ],
  specifications: [
    { label: 'Fabric Base', value: '100% Pure Mulberry Silk' },
    { label: 'Weave Technique', value: 'Traditional Korvai Interlock Weave' },
    { label: 'Regional Craft Origin', value: 'Kanchipuram, Tamil Nadu' },
    { label: 'Zari Material', value: 'Tested Pure Gold Zari' },
    { label: 'Silk Mark Certification', value: 'Certified SM/IND/2026/9102' },
    { label: 'Saree Length', value: '5.5 metres' },
    { label: 'Blouse Piece', value: '0.8 metres included' },
    { label: 'Wash Care Instructions', value: 'Dry Clean Only, Store in Muslin Bag' },
  ],
  customSkuMessage: 'Collector Choice Handloom',
};

const meta: Meta<any> = {
  title: 'Organisms/ProductDetailFragment',
  component: ProductDetailFragment,
  args: {
    ...THEME_ARGS,
    product: sampleProduct,
    mode: 'live',
    borderless: true,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

type Story = StoryObj<typeof ProductDetailFragment>;

/**
 * Mobile Live Customer PDP (Borderless Flush Layout per AGENTS.md rules)
 */
export const MobileLivePDP: Story = {
  name: 'Mobile Live PDP (Flush Borderless)',
  decorators: [withFormFactor('mobile', 'VF2B56 Customer PDP')],
  args: {
    product: sampleProduct,
    mode: 'live',
    borderless: true,
  },
};

/**
 * Storefront Administration Publishing Preview (Top Banner + Preview Mode)
 */
export const AdminPublishingPreview: Story = {
  name: 'Admin Publishing Live Preview Modal',
  decorators: [withFormFactor('mobile', 'Admin Publishing Preview')],
  args: {
    product: sampleProduct,
    mode: 'preview',
    borderless: true,
    onBack: () => alert('Admin: Exiting Preview Modal'),
  },
};

/**
 * Desktop Wide Viewport (Cards Presentation)
 */
export const DesktopCardsPDP: Story = {
  name: 'Desktop View (Card Containers)',
  decorators: [withFormFactor('desktop', 'Desktop Viewport')],
  args: {
    product: sampleProduct,
    mode: 'live',
    borderless: false,
  },
};

/**
 * Out of Stock / Waitlist State
 */
export const OutOfStockWaitlist: Story = {
  name: 'Out of Stock (Waitlist CTA)',
  decorators: [withFormFactor('mobile', 'Out of Stock State')],
  args: {
    product: {
      ...sampleProduct,
      inStock: false,
      stockQuantity: 0,
    },
    mode: 'live',
    borderless: true,
  },
};

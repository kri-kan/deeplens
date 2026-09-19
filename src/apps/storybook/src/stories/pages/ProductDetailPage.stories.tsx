import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ProductDetailPage } from '../../components/pages/ProductDetailPage';
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

export const DesktopView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'desktop' },
  },
  render: (args) => <ProductDetailPage {...args} />,
};

export const TabletView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'tablet' },
  },
  render: (args) => <ProductDetailPage {...args} />,
};

export const MobileView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
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

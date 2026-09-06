import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ProductDetailPage } from '../../components/pages/ProductDetailPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: 'Pages/Store/ProductDetail',
  component: ProductDetailPage,
  args: {
    ...THEME_ARGS,
    onNavigateHome: () => alert('Navigating to Home'),
    onNavigateCatalog: () => alert('Navigating to Catalog'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof ProductDetailPage>;

export const InteractiveFormFactors: Story = {
  render: (args) => (
    <FormFactorPreview title="ProductDetailPage" initialFactor="desktop">
      <ProductDetailPage {...args} />
    </FormFactorPreview>
  ),
};

export const DesktopView: Story = {
  decorators: [withFormFactor('desktop', 'Desktop View (1200px)')],
};

export const TabletView: Story = {
  decorators: [withFormFactor('tablet', 'Tablet View (768px)')],
};

export const MobileView: Story = {
  decorators: [withFormFactor('mobile', 'Mobile View (390px)')],
};

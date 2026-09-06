import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CatalogPage } from '../../components/pages/CatalogPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: 'Pages/Store/Catalog',
  component: CatalogPage,
  args: {
    ...THEME_ARGS,
    onOpenProduct: (name: string) => alert(`Opening PDP for: ${name || 'Product'}`),
    onNavigateHome: () => alert('Navigating to Home'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof CatalogPage>;

export const InteractiveFormFactors: Story = {
  render: (args) => (
    <FormFactorPreview title="CatalogPage" initialFactor="desktop">
      <CatalogPage {...args} />
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

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { WishlistPage } from '../../components/pages/WishlistPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Store/Wishlist',
  component: WishlistPage,
  args: {
    ...THEME_ARGS,
    onNavigateHome: () => alert('Navigating to Home'),
    onNavigateCatalog: () => alert('Navigating to Catalog'),
    onNavigateCart: () => alert('Navigating to Shopping Bag'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof WishlistPage>;

export const InteractiveFormFactors: Story = {
  render: (args) => (
    <FormFactorPreview title="My Cherished Pieces" initialFactor="desktop">
      <WishlistPage {...args} />
    </FormFactorPreview>
  ),
};

export const DesktopView: Story = {
  decorators: [withFormFactor('desktop', 'Wishlist (1200px Desktop)')],
};

export const TabletView: Story = {
  decorators: [withFormFactor('tablet', 'Wishlist (768px Tablet)')],
};

export const MobileView: Story = {
  decorators: [withFormFactor('mobile', 'Wishlist (390px Mobile)')],
};

export const EmptyWishlistView: Story = {
  args: {
    initialItems: [],
  },
  decorators: [withFormFactor('desktop', 'Empty Wishlist View')],
};

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { WishlistPage } from '../../components/pages/WishlistPage';
import { withFormFactor } from '../utils/FormFactorPreview';
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
  render: (args) => <WishlistPage {...args} />,
};

export const DesktopView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'desktop' },
  },
  render: (args) => <WishlistPage {...args} />,
};

export const TabletView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'tablet' },
  },
  render: (args) => <WishlistPage {...args} />,
};

export const MobileView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: (args) => <WishlistPage {...args} />,
};

export const EmptyWishlistView: Story = {
  args: {
    initialItems: [],
  },
  decorators: [withFormFactor('desktop', 'Empty Wishlist View')],
};

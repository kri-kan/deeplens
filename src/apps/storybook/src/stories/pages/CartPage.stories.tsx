import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CartPage, INITIAL_CART_ITEMS } from '../../components/pages/CartPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Store/Cart',
  component: CartPage,
  args: {
    ...THEME_ARGS,
    onNavigateHome: () => alert('Navigating to Home'),
    onNavigatePDP: (name: string) => alert(`Navigating to PDP for: ${name || 'Saree'}`),
    onProceedToCheckout: (summary: any) =>
      alert(`Proceeding to checkout with ${summary.items.length} items. Total: ₹${summary.finalTotal}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof CartPage>;

export const InteractiveFormFactors: Story = {
  render: (args) => (
    <FormFactorPreview title="Shopping Bag" initialFactor="desktop">
      <CartPage {...args} />
    </FormFactorPreview>
  ),
};

export const DesktopView: Story = {
  decorators: [withFormFactor('desktop', 'Shopping Bag (1200px Desktop)')],
};

export const TabletView: Story = {
  decorators: [withFormFactor('tablet', 'Shopping Bag (768px Tablet)')],
};

export const MobileView: Story = {
  decorators: [withFormFactor('mobile', 'Shopping Bag (390px Mobile)')],
};

export const EmptyBagView: Story = {
  args: {
    initialItems: [],
  },
  decorators: [withFormFactor('desktop', 'Empty Shopping Bag')],
};

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CartPage, INITIAL_CART_ITEMS } from '../../components/pages/CartPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Store/Cart',
  component: CartPage,
  args: {
    ...THEME_ARGS,
    initialItems: INITIAL_CART_ITEMS,
    onNavigateHome: () => alert('Navigating to Home'),
    onNavigatePDP: (name: string) => alert(`Navigating to PDP for: ${name || 'Saree'}`),
    onProceedToCheckout: (summary: any) =>
      alert(`Proceeding to checkout with ${summary.items.length} items! Total: ₹${summary.finalTotal}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof CartPage>;

/**
 * 1. Interactive Shopping Bag (Responsive):
 * Full-featured cart adapting dynamically across Mobile, Tablet, and Desktop in FormFactorShell.
 */
export const DefaultCart: Story = {
  name: '1. Interactive Shopping Bag (Responsive)',
  render: (args) => <CartPage {...args} />,
};

/**
 * 2. Empty Bag State:
 * Displays zero-item state with CTA to explore ethnic handloom catalog.
 */
export const EmptyBagView: Story = {
  name: '2. Empty Shopping Bag',
  args: {
    initialItems: [],
  },
  render: (args) => <CartPage {...args} />,
};

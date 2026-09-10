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
    initialItems: INITIAL_CART_ITEMS,
    onNavigateHome: () => alert('Navigating to Home'),
    onNavigatePDP: (name: string) => alert(`Navigating to PDP for: ${name || 'Saree'}`),
    onProceedToCheckout: (summary: any) => alert(`Proceeding to checkout with ${summary.items.length} items! Total: ₹${summary.finalTotal}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof CartPage>;

/**
 * 1. Default Interactive Shopping Bag:
 * Full-featured cart with item selection, pincode validation, coupon codes, and donation options.
 */
export const DefaultCart: Story = {
  name: '1. Standard Shopping Bag (1200px Desktop)',
  decorators: [withFormFactor('desktop', 'Shopping Bag (1200px Desktop)')],
};

/**
 * 2. Mobile Form Factor (390px):
 * Mobile shopping bag with sticky bottom checkout bar.
 */
export const MobileCartView: Story = {
  name: '2. Mobile Shopping Bag (390px Viewport)',
  decorators: [withFormFactor('mobile', 'Shopping Bag (390px Mobile)')],
};

/**
 * 3. Empty Bag State:
 * Displays zero-item state with CTA to explore ethnic handloom catalog.
 */
export const EmptyBagView: Story = {
  name: '3. Empty Shopping Bag',
  args: {
    initialItems: [],
  },
  decorators: [withFormFactor('desktop', 'Empty Shopping Bag')],
};

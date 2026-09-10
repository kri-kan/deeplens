import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { BetaCartPage, INITIAL_BETA_CART_ITEMS } from '../../../components/pages/BetaCart';
import { FormFactorPreview, withFormFactor } from '../../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Store - Beta/Beta Cart',
  component: BetaCartPage,
  args: {
    ...THEME_ARGS,
    initialItems: INITIAL_BETA_CART_ITEMS,
    isSharedView: false,
    shareToken: 'crt_9x8k2m',
    onNavigateHome: () => alert('Navigating to Home'),
    onNavigatePDP: (name: string) => alert(`Navigating to PDP for: ${name || 'Saree'}`),
    onShareWhatsApp: (message: string, url: string) => alert(`Sharing on WhatsApp:\n\n${message}`),
    onImportToVayyariOrder: (items: any[]) => alert(`Importing ${items.length} items to Vayyari Order Builder!`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    isSharedView: {
      control: 'boolean',
      description: 'Viewing as a shared cart from WhatsApp link (sales concierge perspective)',
    },
    shareToken: {
      control: 'text',
      description: 'Unique share token for the cart',
    },
  },
};
export default meta;
type Story = StoryObj<typeof BetaCartPage>;

/**
 * 1. Default Beta Cart (Desktop 1100px):
 * Anonymous device-synced cart (30d TTL), NO coupons, NO donations, 1-click WhatsApp order handoff.
 */
export const DefaultBetaCart: Story = {
  name: '1. Device-Synced Beta Bag (WhatsApp Order CTA & Share Token)',
  decorators: [withFormFactor('desktop', 'Beta Shopping Bag (1100px Desktop)')],
};

/**
 * 2. Shared Cart Sales Concierge View:
 * How a Vayyari admin / sales concierge sees the customer's shared cart after clicking the WhatsApp link.
 * Features 1-tap "Import to Order Builder" button.
 */
export const SharedCartSalesView: Story = {
  name: '2. Shared Cart View (Sales Concierge Perspective)',
  args: {
    isSharedView: true,
    shareToken: 'crt_9x8k2m',
  },
  decorators: [withFormFactor('desktop', 'Shared Cart Link (Sales View)')],
};

/**
 * 3. Mobile PWA Bag (390px):
 * Mobile PWA shopping bag with sticky bottom WhatsApp order button.
 */
export const MobileBetaCartView: Story = {
  name: '3. Mobile PWA Beta Bag (390px Viewport)',
  decorators: [withFormFactor('mobile', 'Beta Shopping Bag (390px Mobile)')],
};

/**
 * 4. Empty Bag State:
 * Displays zero-item state with CTA to explore ethnic handloom catalog.
 */
export const EmptyBetaBagView: Story = {
  name: '4. Empty Beta Bag',
  args: {
    initialItems: [],
  },
  decorators: [withFormFactor('desktop', 'Empty Shopping Bag')],
};

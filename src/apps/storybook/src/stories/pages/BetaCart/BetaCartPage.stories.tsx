import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { BetaCartPage, INITIAL_BETA_CART_ITEMS } from '../../../components/pages/BetaCart';
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
 * 1. Default Beta Cart (Responsive):
 * Anonymous device-synced cart (30d TTL), NO coupons, NO donations, 1-click WhatsApp order handoff.
 * Adapts across Mobile (390px), Tablet (768px), and Desktop (1280px) in FormFactorShell.
 */
export const DefaultBetaCart: Story = {
  name: '1. Device-Synced Beta Bag (Responsive)',
  render: (args) => <BetaCartPage {...args} />,
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
  render: (args) => <BetaCartPage {...args} />,
};

/**
 * 3. Empty Bag State:
 * Displays zero-item state with CTA to explore ethnic handloom catalog.
 */
export const EmptyBetaBagView: Story = {
  name: '3. Empty Beta Bag',
  args: {
    initialItems: [],
  },
  render: (args) => <BetaCartPage {...args} />,
};

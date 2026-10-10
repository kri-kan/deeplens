import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AllOrdersPage,
  AllOrdersPageProps,
} from '../../components/pages/AllOrdersPage';
import { OrderIdHistoryEntry } from '../../components/molecules/OrderIdHistoryItem';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const now = new Date();
const MOCK_ALL_ORDERS: OrderIdHistoryEntry[] = Array.from({ length: 25 }).map((_, i) => {
  const isWhatsApp = i % 2 === 0;
  const isCod = i % 3 === 0;
  const isDeleted = i === 7 || i === 18;
  const idNum = 849200 - i;

  return {
    id: String(idNum),
    source: isWhatsApp ? 'whatsapp' : 'instagram',
    paymentMode: isCod ? 'cod' : 'prepaid',
    timestamp: new Date(now.getTime() - i * 3600 * 1000 * 4).toISOString(),
    customerPhone: isWhatsApp ? `+91 98765 ${10000 + i}` : undefined,
    instagramHandle: !isWhatsApp ? `@boutique_customer_${i + 1}` : undefined,
    sourceHandle: isWhatsApp ? `+91 98765 ${10000 + i}` : `@boutique_customer_${i + 1}`,
    isDeleted,
  };
});

const meta: Meta<AllOrdersPageProps> = {
  title: 'Pages/Admin/AllOrdersPage',
  component: AllOrdersPage,
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    orders: MOCK_ALL_ORDERS,
    totalCount: 142,
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    searchQuery: '',
    sortBy: 'date_desc',
    sourceFilter: 'all',
    paymentModeFilter: 'all',
    deletedFilter: 'active',
    onNavigateToDetails: (id: string) => alert(`Navigating to order #${id} details`),
    onBack: () => alert('Back pressed'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  } as any,
};

export default meta;
type Story = StoryObj<typeof AllOrdersPage>;

export const DefaultMobile: Story = {
  name: '1. Default Paginated List (Mobile)',
  decorators: [withFormFactor('mobile', 'All Orders - Paginated')],
  args: {
    disableSafeArea: true,
    orders: MOCK_ALL_ORDERS.slice(0, 10),
    totalCount: 142,
    hasMore: true,
  },
};

/**
 * 2. Loading / Shimmer State
 * Demonstrates smooth animated pulse shimmer skeleton placeholders while loading all orders.
 */
export const LoadingShimmerState: Story = {
  name: '2. Loading / Shimmer State',
  decorators: [withFormFactor('mobile', 'All Orders - Loading Shimmer')],
  args: {
    disableSafeArea: true,
    orders: [],
    isLoading: true,
  },
};

export const LoadingMoreState: Story = {
  name: '3. Loading More (Infinite Scroll Footer)',
  decorators: [withFormFactor('mobile', 'All Orders - Loading More')],
  args: {
    disableSafeArea: true,
    orders: MOCK_ALL_ORDERS.slice(0, 10),
    totalCount: 142,
    hasMore: true,
    isLoadingMore: true,
  },
};

export const EmptyState: Story = {
  name: '4. Search No Results',
  decorators: [withFormFactor('mobile', 'All Orders - Empty')],
  args: {
    disableSafeArea: true,
    orders: [],
    totalCount: 0,
    searchQuery: 'NonexistentOrder#999',
    isLoading: false,
  },
};

export const TabletView: Story = {
  name: '5. Tablet Viewport',
  decorators: [withFormFactor('tablet', 'All Orders - Tablet')],
  args: {
    disableSafeArea: true,
    orders: MOCK_ALL_ORDERS,
    totalCount: 142,
  },
};


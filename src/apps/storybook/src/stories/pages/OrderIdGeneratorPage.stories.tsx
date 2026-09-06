import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  OrderIdGeneratorPage,
  OrderIdGeneratorPageProps,
} from '../../components/pages/OrderIdGeneratorPage';
import { OrderIdHistoryEntry } from '../../components/molecules/OrderIdHistoryItem';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const now = new Date();
const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const MOCK_HISTORY: OrderIdHistoryEntry[] = [
  {
    id: '849201',
    source: 'whatsapp',
    paymentMode: 'cod',
    timestamp: tenMinsAgo.toISOString(),
    customerPhone: '+91 98765 43210',
    sourceHandle: '+91 98765 43210',
    isDeleted: false,
  },
  {
    id: '849198',
    source: 'instagram',
    paymentMode: 'prepaid',
    timestamp: twoHoursAgo.toISOString(),
    instagramHandle: '@ananya_couture',
    sourceHandle: '@ananya_couture',
    isDeleted: false,
  },
  {
    id: '849175',
    source: 'whatsapp',
    paymentMode: 'prepaid',
    timestamp: yesterday.toISOString(),
    customerPhone: '+91 91234 56789',
    sourceHandle: '+91 91234 56789',
    isDeleted: false,
  },
  {
    id: '849150',
    source: 'instagram',
    paymentMode: 'cod',
    timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
    instagramHandle: '@designer_sarees_hyd',
    sourceHandle: '@designer_sarees_hyd',
    isDeleted: true,
  },
];

// ─────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────

const meta: Meta<OrderIdGeneratorPageProps> = {
  title: 'Pages/Admin/OrderIdGenerator',
  component: OrderIdGeneratorPage,
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    initialRecentIds: MOCK_HISTORY,
    onNavigateToDetails: (id: string) => alert(`Navigating to order #${id} details`),
    onOpenSettings: () => alert('Opening settings / preferences modal'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    disableSafeArea: {
      control: 'boolean',
      description: 'Disable safe area insets (useful inside mock device frames)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof OrderIdGeneratorPage>;

// ─────────────────────────────────────────────
// 7-State UI Validation Stories
// ─────────────────────────────────────────────

/**
 * 1. Populated History (Default Mobile View)
 * Shows active orders, platform badges, timestamps, and quick copy actions.
 */
export const PopulatedState: Story = {
  name: '1. Populated History (Mobile)',
  decorators: [withFormFactor('mobile', 'Order ID Hub - Active')],
  args: {
    disableSafeArea: true,
    initialRecentIds: MOCK_HISTORY,
    initialGeneratedEntry: null,
  },
};

/**
 * 2. Empty State
 * Clean generator card with empty activity state.
 */
export const EmptyState: Story = {
  name: '2. Empty State (No Activity)',
  decorators: [withFormFactor('mobile', 'Order ID Hub - Empty')],
  args: {
    disableSafeArea: true,
    initialRecentIds: [],
    initialGeneratedEntry: null,
  },
};

/**
 * 3. Just Generated ID State
 * Order #849215 generated just now with green highlight banner and one-tap copy actions.
 */
export const JustGeneratedState: Story = {
  name: '3. Just Generated ID (Highlight Banner)',
  decorators: [withFormFactor('mobile', 'Order ID Hub - Generated')],
  args: {
    disableSafeArea: true,
    initialRecentIds: MOCK_HISTORY,
    initialGeneratedEntry: {
      id: '849215',
      source: 'whatsapp',
      paymentMode: 'cod',
      timestamp: new Date().toISOString(),
      sourceHandle: '+91 98765 00000',
      isNew: true,
    },
  },
};

/**
 * 4. Generating Loading State
 * Demonstrates button spinner and busy state.
 */
export const GeneratingLoadingState: Story = {
  name: '4. Generating / Busy State',
  decorators: [withFormFactor('mobile', 'Order ID Hub - Generating')],
  args: {
    disableSafeArea: true,
    initialRecentIds: MOCK_HISTORY,
    initialSelectedSource: 'whatsapp',
    initialPaymentMode: 'cod',
    initialSourceHandle: '+91 99887 76655',
    isLoading: true,
  },
};

/**
 * 5. With Deleted Entries Toggled
 * Demonstrates 'Show Deleted' switch enabled, revealing deleted orders with badge and dimmed styling.
 */
export const WithDeletedToggled: Story = {
  name: '5. With Deleted Toggled',
  decorators: [withFormFactor('mobile', 'Order ID Hub - With Deleted')],
  args: {
    disableSafeArea: true,
    initialRecentIds: MOCK_HISTORY,
    initialShowDeleted: true,
  },
};

/**
 * 6. Responsive Tablet View
 * Demonstrates wide layout responsiveness.
 */
export const TabletView: Story = {
  name: '6. Tablet / Large Viewport',
  decorators: [withFormFactor('tablet', 'Order ID Hub - Tablet')],
  args: {
    disableSafeArea: true,
    initialRecentIds: MOCK_HISTORY,
    initialGeneratedEntry: {
      id: '849215',
      source: 'instagram',
      paymentMode: 'prepaid',
      timestamp: new Date().toISOString(),
      sourceHandle: '@luxury_kanjivaram',
      isNew: true,
    },
  },
};

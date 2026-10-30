import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminWhatsAppUpdatesPage,
  DEFAULT_WA_POSTS,
} from '../../components/pages/AdminWhatsAppUpdatesPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/WA Updates',
  component: AdminWhatsAppUpdatesPage,
  decorators: [withFormFactor('mobile', 'WA Updates (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    posts: DEFAULT_WA_POSTS,
    activeTab: 'customer',
    showAll: false,
    isPromptOpen: false,
    customerUnsharedCount: DEFAULT_WA_POSTS.filter((p) => !p.isShared).length,
    resellerUnsharedCount: DEFAULT_WA_POSTS.filter((p) => !p.isShared).length,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

/**
 * Story 1: Default View - Customer Updates Chat Head (Left-Aligned, Reference 58px)
 * Shows left-aligned circular chat heads matching Collab Planner (58px story ring, 48px inner circle).
 * "All" toggle is OFF by default, displaying only unposted items.
 * Diligent message below chat heads is removed.
 */
export const DefaultCustomerUpdates: Story = {
  name: '1. Default: Customer Updates (Unshared Only)',
  args: {
    activeTab: 'customer',
    showAll: false,
    isPromptOpen: false,
  },
};

/**
 * Story 2: Reseller Updates Chat Head Active
 * Reseller Updates circular chat head selected with emerald story ring.
 * Consolidated list showing unposted items for wholesale/reseller distribution.
 */
export const ResellerUpdatesFeed: Story = {
  name: '2. Reseller Updates Chat Head',
  args: {
    activeTab: 'reseller',
    showAll: false,
    isPromptOpen: false,
  },
};

/**
 * Story 3: 'All' Toggle Turned ON
 * Displays all consolidated posts including previously shared and ignored items with timestamps.
 */
export const AllToggleActive: Story = {
  name: '3. "All" Toggle ON (Shared, Ignored & Unposted)',
  args: {
    activeTab: 'customer',
    showAll: true,
    isPromptOpen: false,
  },
};

/**
 * Story 4: Return Confirmation Prompt - Customer Updates
 * Appears upon returning from WhatsApp intent:
 * Question: "Shared to Daily Updates?"
 * Actions: "Shared to Daily Updates", "Ignore (No Intention of Sharing)", "Dismiss".
 */
export const ReturnConfirmationPromptCustomer: Story = {
  name: '4. Return Prompt: Shared to Daily Updates?',
  args: {
    activeTab: 'customer',
    showAll: false,
    isPromptOpen: true,
    selectedPost: DEFAULT_WA_POSTS[0],
  },
};

/**
 * Story 5: Return Confirmation Prompt - Reseller Updates
 * Appears upon returning from WhatsApp intent:
 * Question: "Shared to Reseller Trending?"
 * Actions: "Shared to Reseller Trending", "Ignore (No Intention of Sharing)", "Dismiss".
 */
export const ReturnConfirmationPromptReseller: Story = {
  name: '5. Return Prompt: Shared to Reseller Trending?',
  args: {
    activeTab: 'reseller',
    showAll: false,
    isPromptOpen: true,
    selectedPost: DEFAULT_WA_POSTS[1],
  },
};

/**
 * Story 6: All Caught Up (Empty State)
 * All posts shared or ignored. Celebratory checkmark with "View All" CTA.
 */
export const AllCaughtUpEmptyState: Story = {
  name: '6. All Caught Up (Empty Diligent State)',
  args: {
    activeTab: 'customer',
    showAll: false,
    isPromptOpen: false,
    posts: [],
    customerUnsharedCount: 0,
    resellerUnsharedCount: 0,
  },
};

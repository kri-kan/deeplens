import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { AdminCurationPage } from '../../components/pages/AdminCurationPage';
import { DEFAULT_PRODUCTS, DEFAULT_CHANNELS } from '../../components/pages/AdminPostPlannerPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Curation',
  component: AdminCurationPage,
  decorators: [withFormFactor('mobile', 'Admin Curation Grid (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    products: DEFAULT_PRODUCTS,
    channels: DEFAULT_CHANNELS,
    initialTab: 'starred',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    initialTab: {
      control: 'radio',
      options: ['starred', 'completed'],
      description: 'Active Curation header toggle',
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * 1. Primary Interactive Curation Workbench:
 * Operator views active Starred items requiring curation, can tap garments to open
 * the Target Channel Eligibilities bottom sheet, trigger AI suggestions, search,
 * and test Save (keeps in Starred) vs Complete (transitions to Completed).
 */
export const InteractiveWorkbench: Story = {
  name: '1. Starred Items (Interactive Workbench)',
  args: {
    initialTab: 'starred',
    products: DEFAULT_PRODUCTS,
  },
};

/**
 * 2. Completed Items Tab:
 * Operator switches header toggle to Completed to view finalized garments ready for distribution.
 */
export const CompletedItemsView: Story = {
  name: '2. Completed Items Tab',
  args: {
    initialTab: 'completed',
    products: DEFAULT_PRODUCTS,
  },
};

/**
 * 3. Target Eligibilities Sheet Active:
 * Garment selected with slide-up bottom sheet open displaying compact AI Suggest action,
 * circular channel avatars, and Save / Complete footer buttons.
 */
export const TargetEligibilitiesActive: Story = {
  name: '3. Action Active: Target Eligibilities Sheet Open',
  args: {
    initialTab: 'starred',
    affinitySheetOpen: true,
    selectedAffinityProduct: DEFAULT_PRODUCTS[0],
    products: DEFAULT_PRODUCTS,
  },
};

/**
 * 4. Search Query Filtered State:
 * Simulates active search query for 'Saree' items in catalog.
 */
export const FilteredSearchQuery: Story = {
  name: "4. Search Query Active ('Saree')",
  args: {
    initialTab: 'starred',
    searchQuery: 'Saree',
    products: DEFAULT_PRODUCTS,
  },
};

/**
 * 5. Empty Starred State:
 * All catalog items have been curated and completed (0 items in Starred tab).
 */
export const EmptyStarredState: Story = {
  name: '5. Empty State: All Items Completed (0 Starred)',
  args: {
    initialTab: 'starred',
    products: DEFAULT_PRODUCTS.map((p) => ({ ...p, planningStatus: 'complete' as const })),
  },
};

/**
 * 6. Empty Completed State:
 * Zero catalog items have been completed yet (0 items in Completed tab).
 */
export const EmptyCompletedState: Story = {
  name: '6. Empty State: Zero Completed Items',
  args: {
    initialTab: 'completed',
    products: DEFAULT_PRODUCTS.map((p) => ({ ...p, planningStatus: 'in_progress' as const })),
  },
};

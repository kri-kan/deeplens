import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { AdminPostPlannerPage, DEFAULT_PRODUCTS, DEFAULT_CHANNELS } from '../../components/pages/AdminPostPlannerPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Post Planner',
  component: AdminPostPlannerPage,
  decorators: [withFormFactor('mobile', 'Admin Post Planner (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    channels: DEFAULT_CHANNELS,
    products: DEFAULT_PRODUCTS,
    activeChannelId: 'ch-3',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

/**
 * 1. Default Sharing Queue (Interactive Workbench):
 * Displaying the active publishing queue for @saree_dump (ch-3) with scheduled,
 * ready, and live posts. Allows selecting channels, opening the Share Action modal,
 * scheduling, sharing now, or excluding items from channel.
 */
export const InteractiveWorkbench: Story = {
  name: '1. Default Sharing Queue (@saree_dump)',
  args: {
    activeChannelId: 'ch-3',
  },
};

/**
 * 2. Focus Channel Queue State: Switched to @vayyari_fashions (ch-1) focus luxury brand.
 */
export const FocusChannelQueue: Story = {
  name: '2. Focus Channel Queue (@vayyari_fashions)',
  args: {
    activeChannelId: 'ch-1',
  },
};

/**
 * 3. Secondary Focus Channel: @dressbyvayyari (ch-2) kurti and dress brand.
 */
export const SecondaryFocusQueue: Story = {
  name: '3. Focus Channel Queue (@dressbyvayyari)',
  args: {
    activeChannelId: 'ch-2',
  },
};

/**
 * 4. Share Action Modal Active: Operator tapped a queue garment; action sheet
 * is open displaying 1-tap "Shared Now", schedule presets, and exclusion options.
 */
export const ShareActionModalActive: Story = {
  name: '4. Action Active: Share & Schedule Modal Open',
  args: {
    activeChannelId: 'ch-3',
    shareModalOpen: true,
    selectedShareItem: {
      ...DEFAULT_PRODUCTS[0],
      status: 'assigned',
    },
  },
};

/**
 * 5. Modal Active on Already Scheduled Garment:
 * Displays scheduled time with options to reschedule or share immediately.
 */
export const ScheduledGarmentModalActive: Story = {
  name: '5. Action Active: Scheduled Item Modal Open',
  args: {
    activeChannelId: 'ch-3',
    shareModalOpen: true,
    selectedShareItem: {
      ...DEFAULT_PRODUCTS[0],
      status: 'scheduled',
      scheduledTimeLabel: 'Tomorrow 11 AM',
    },
  },
};

/**
 * 6. Empty Queue State: Channel has zero assigned garments, displaying
 * empty state illustrations and CTA to curate more catalog items.
 */
export const EmptyChannelQueueState: Story = {
  name: '6. Empty State: Channel Queue Empty',
  args: {
    activeChannelId: 'ch-4',
    queueItems: [],
  },
};

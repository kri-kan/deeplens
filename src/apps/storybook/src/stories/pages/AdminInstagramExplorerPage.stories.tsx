import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminInstagramExplorerPage,
  DEFAULT_CATEGORY_GROUPS,
} from '../../components/pages/AdminInstagramExplorerPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Instagram Explorer',
  component: AdminInstagramExplorerPage,
  decorators: [withFormFactor('mobile', 'Admin Instagram Explorer (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    categories: DEFAULT_CATEGORY_GROUPS,
    reviewBadgeCount: 16,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

/**
 * 1. Default Instagram Explorer Dashboard
 * Shows top navigation with sync/queue shortcuts, Story Planner quick actions,
 * Post Planner feature banner, and categorized active business/general/competitor profiles.
 */
export const DefaultDashboard: Story = {
  name: '1. Default Dashboard',
  args: {
    categories: DEFAULT_CATEGORY_GROUPS,
    reviewBadgeCount: 16,
  },
};

/**
 * 2. Zero Review Items State
 * Shows the dashboard when all stories have been reviewed (no red review alert badge).
 */
export const ZeroReviewAlerts: Story = {
  name: '2. All Stories Reviewed (0 Badge)',
  args: {
    categories: DEFAULT_CATEGORY_GROUPS,
    reviewBadgeCount: 0,
  },
};

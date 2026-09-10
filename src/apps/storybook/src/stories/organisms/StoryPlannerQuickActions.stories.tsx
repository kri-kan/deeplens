import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { StoryPlannerQuickActions } from '../../components/organisms/StoryPlannerQuickActions';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<any> = {
  title: 'Organisms/StoryPlannerQuickActions',
  component: StoryPlannerQuickActions,
  decorators: [withFormFactor('mobile', 'Story Planner Quick Actions (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    reviewBadgeCount: 16,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const DefaultGrid: Story = {
  name: '1. Standard 4-Action Grid',
  args: {
    reviewBadgeCount: 16,
  },
};

export const ZeroReviewBadge: Story = {
  name: '2. All Reviewed (0 Badge)',
  args: {
    reviewBadgeCount: 0,
  },
};

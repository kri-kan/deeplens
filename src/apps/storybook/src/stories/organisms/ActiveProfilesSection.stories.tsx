import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ActiveProfilesSection } from '../../components/organisms/ActiveProfilesSection';
import { DEFAULT_CATEGORY_GROUPS } from '../../components/pages/AdminInstagramExplorerPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<any> = {
  title: 'Organisms/ActiveProfilesSection',
  component: ActiveProfilesSection,
  decorators: [withFormFactor('mobile', 'Active Profiles Categorized Section (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    categories: DEFAULT_CATEGORY_GROUPS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const DefaultCategorized: Story = {
  name: '1. Categorized Profiles (My Business, General, Competitors)',
  args: {
    categories: DEFAULT_CATEGORY_GROUPS,
  },
};

export const SingleCategory: Story = {
  name: '2. Single Category Only',
  args: {
    categories: [DEFAULT_CATEGORY_GROUPS[0]],
  },
};

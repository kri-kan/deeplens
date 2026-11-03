import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { AdminSurveyStudioPage } from '../../components/pages/AdminSurveyStudioPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Survey Studio & Response Visualizer',
  component: AdminSurveyStudioPage,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const DefaultStory: Story = {
  name: 'Survey Studio & Response Inspector',
  render: () => {
    return <AdminSurveyStudioPage apiBaseUrl="http://localhost:5200" />;
  },
};

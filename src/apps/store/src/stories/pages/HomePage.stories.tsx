import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { HomePage } from '../../components/pages/HomePage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: 'Pages/Store/Home',
  component: HomePage,
  args: {
    ...THEME_ARGS,
    onNavigateCatalog: () => alert('Navigating to Catalog Page'),
    onNavigatePDP: (name: string) => alert(`Navigating to PDP for: ${name || 'Product'}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof HomePage>;

export const InteractiveFormFactors: Story = {
  render: (args) => (
    <FormFactorPreview title="HomePage" initialFactor="desktop">
      <HomePage {...args} />
    </FormFactorPreview>
  ),
};

export const DesktopView: Story = {
  decorators: [withFormFactor('desktop', 'Desktop View (1200px)')],
};

export const TabletView: Story = {
  decorators: [withFormFactor('tablet', 'Tablet View (768px)')],
};

export const MobileView: Story = {
  decorators: [withFormFactor('mobile', 'Mobile View (390px)')],
};

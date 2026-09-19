import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { HomePage } from '../../components/pages/HomePage';
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
  render: (args) => <HomePage {...args} />,
};

export const DesktopView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'desktop' },
  },
  render: (args) => <HomePage {...args} />,
};

export const TabletView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'tablet' },
  },
  render: (args) => <HomePage {...args} />,
};

export const MobileView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: (args) => <HomePage {...args} />,
};

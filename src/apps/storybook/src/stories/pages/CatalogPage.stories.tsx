import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CatalogPage } from '../../components/pages/CatalogPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Store/Catalog',
  component: CatalogPage,
  args: {
    ...THEME_ARGS,
    onOpenProduct: (name: string) => alert(`Opening PDP for: ${name || 'Product'}`),
    onNavigateHome: () => alert('Navigating to Home'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof CatalogPage>;

export const InteractiveFormFactors: Story = {
  render: (args) => <CatalogPage {...args} />,
};

export const DesktopView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'desktop' },
  },
  render: (args) => <CatalogPage {...args} />,
};

export const TabletView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'tablet' },
  },
  render: (args) => <CatalogPage {...args} />,
};

export const MobileView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: (args) => <CatalogPage {...args} />,
};

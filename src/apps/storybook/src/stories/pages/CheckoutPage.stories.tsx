import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CheckoutPage } from '../../components/pages/CheckoutPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Store/Checkout',
  component: CheckoutPage,
  args: {
    ...THEME_ARGS,
    onNavigateHome: () => alert('Navigating to Home'),
    onNavigateBag: () => alert('Navigating back to Bag'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof CheckoutPage>;

export const InteractiveFormFactors: Story = {
  render: (args) => <CheckoutPage {...args} />,
};

export const DesktopView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'desktop' },
  },
  render: (args) => <CheckoutPage {...args} />,
};

export const TabletView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'tablet' },
  },
  render: (args) => <CheckoutPage {...args} />,
};

export const MobileView: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: (args) => <CheckoutPage {...args} />,
};

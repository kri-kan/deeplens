import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CheckoutPage } from '../../components/pages/CheckoutPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/CheckoutPage',
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
  render: (args) => (
    <FormFactorPreview title="Single-Screen Checkout" initialFactor="desktop">
      <CheckoutPage {...args} />
    </FormFactorPreview>
  ),
};

export const DesktopView: Story = {
  decorators: [withFormFactor('desktop', 'Checkout (1200px Desktop)')],
};

export const TabletView: Story = {
  decorators: [withFormFactor('tablet', 'Checkout (768px Tablet)')],
};

export const MobileView: Story = {
  decorators: [withFormFactor('mobile', 'Checkout (390px Mobile)')],
};

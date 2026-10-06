import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { UtilitiesHubPage } from '../../components/pages/UtilitiesHubPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/UtilitiesHubPage',
  component: UtilitiesHubPage,
  args: {
    ...THEME_ARGS,
    disableSafeArea: true,
    onBack: () => alert('Navigating back to Home Screen'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    disableSafeArea: {
      control: 'boolean',
      description: 'Disable safe area insets inside storybook preview chassis',
    },
  },
};

export default meta;
type Story = StoryObj<any>;

/**
 * 1. Default Mobile Utilities Hub
 * Shows the wrapping chips grid with seeded operational messages (Address, Payment Details,
 * Return Policy, COD Details, Damage Policy), the leading (+) chip, search bar, and recent copies card.
 */
export const DefaultMobileView: Story = {
  name: '1. Utilities Hub (Mobile Default)',
  decorators: [withFormFactor('mobile', 'Utilities Hub - Operational Copier')],
  args: {
    disableSafeArea: true,
  },
};

/**
 * 2. Dark Mode Preview
 * Demonstrates the Utilities Hub under dark mode theme tokens.
 */
export const DarkModeView: Story = {
  name: '2. Dark Mode Utilities Hub',
  decorators: [withFormFactor('mobile', 'Utilities Hub - Dark Mode')],
  args: {
    colorScheme: 'dark',
    disableSafeArea: true,
  },
};

/**
 * 3. Responsive Tablet Layout
 * Shows the Utilities Hub inside a tablet viewport chassis.
 */
export const TabletView: Story = {
  name: '3. Responsive Tablet View',
  decorators: [withFormFactor('tablet', 'Utilities Hub - Tablet Chassis')],
  args: {
    disableSafeArea: true,
  },
};

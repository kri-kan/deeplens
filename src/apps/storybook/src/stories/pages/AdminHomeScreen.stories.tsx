import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminHomeScreen,
  AdminHomeScreenProps,
} from '../../components/pages/AdminHomeScreen';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────

const meta: Meta<any> = {
  title: 'Pages/Admin/AdminHomeScreen',
  component: AdminHomeScreen,
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    initialMenuOpen: false,
    onLaunchTool: (route: string) => console.log(`Navigating to tool: ${route}`),
    onOpenAiAssistant: () => console.log('Opening AI Assistant (/ai)'),
    onOpenSettings: () => console.log('Opening Settings (/modal)'),
    onNewOrder: () => {},
    onEditOrder: () => {},
    onTabChange: (tab: string) => console.log(`Selected tab: ${tab}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    disableSafeArea: {
      control: 'boolean',
      description: 'Disable safe area insets inside storybook preview chassis',
    },
    initialMenuOpen: {
      control: 'boolean',
      description: 'Whether the quick order action overlay is open on mount',
    },
  },
};

export default meta;
type Story = StoryObj<any>;

// ─────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────

/**
 * 1. Default Mobile View
 * Displays the complete Operations Hub screen with categorized operational modules,
 * bottom navigation bar with Utility, Studio, Orders, Insights, and center (+) FAB.
 * Tapping (+) spins it smoothly to (X) and triggers the blurred background overlay with
 * simple containerless "New Order" and "Edit Order" menus emerging smoothly from below.
 */
export const DefaultHomeScreen: Story = {
  name: '1. Admin Home Screen (Mobile Default)',
  decorators: [withFormFactor('mobile', 'Admin Home Screen - Rest State')],
  args: {
    disableSafeArea: true,
    initialMenuOpen: false,
  },
};

/**
 * 2. Quick Actions Overlay Open
 * Pre-opened state demonstrating the spun (X) button, blurred background backdrop,
 * and the two simple containerless menus: "New Order" and "Edit Order" floating on the blur.
 */
export const QuickActionsOverlayOpen: Story = {
  name: '2. Overlay Active (Spun X + Simple Menus)',
  decorators: [withFormFactor('mobile', 'Admin Home Screen - Quick Actions Active')],
  args: {
    disableSafeArea: true,
    initialMenuOpen: true,
  },
};

/**
 * 3. Search Filter Active ("Order")
 * Demonstrates live module search filtering across all administrative categories.
 */
export const SearchFilterActive: Story = {
  name: '3. Search Filter Active ("order")',
  decorators: [withFormFactor('mobile', 'Admin Home Screen - Filter Active')],
  args: {
    disableSafeArea: true,
    searchQuery: 'order',
  },
};

/**
 * 4. Empty Search Results
 * Displays friendly zero-matches illustration when an unmapped keyword is searched.
 */
export const ZeroMatchesEmptyState: Story = {
  name: '4. Zero Matches Empty State',
  decorators: [withFormFactor('mobile', 'Admin Home Screen - Zero Matches')],
  args: {
    disableSafeArea: true,
    searchQuery: 'xyz-not-found',
  },
};

/**
 * 5. Tablet Responsive View
 * Displays the Admin Home Screen inside a wider viewport layout.
 */
export const TabletView: Story = {
  name: '5. Responsive Tablet View',
  decorators: [withFormFactor('tablet', 'Admin Home Screen - Tablet')],
  args: {
    disableSafeArea: true,
    initialMenuOpen: false,
  },
};

/**
 * 6. Light Mode with Black Text Menus & Reduced Blur
 * Explicitly tests light mode with subtle 5px frosted blur and black text/icons for both emerging menus.
 */
export const LightModeReducedBlur: Story = {
  name: '6. Light Mode (Black Text Menus + 5px Blur)',
  decorators: [withFormFactor('mobile', 'Light Mode - Black Text Menus')],
  args: {
    colorScheme: 'light',
    disableSafeArea: true,
    initialMenuOpen: true,
  },
};

/**
 * 7. Dark Mode (Full Screen Validation)
 * Tests entire Admin Home Screen under dark mode color scheme (dark surface, canvas, header, modules & dock).
 */
export const DarkModeHomeScreen: Story = {
  name: '7. Dark Mode (Rest State)',
  decorators: [withFormFactor('mobile', 'Dark Mode - Admin Home Screen')],
  args: {
    colorScheme: 'dark',
    disableSafeArea: true,
    initialMenuOpen: false,
  },
};

/**
 * 8. Dark Mode with Reduced Blur Overlay
 * Tests dark theme with spun (X) button, frosted dark backdrop (5px blur), and high-contrast emerging action menus.
 */
export const DarkModeReducedBlur: Story = {
  name: '8. Dark Mode (Reduced 5px Blur Overlay)',
  decorators: [withFormFactor('mobile', 'Dark Mode - 5px Subtle Blur Overlay')],
  args: {
    colorScheme: 'dark',
    disableSafeArea: true,
    initialMenuOpen: true,
  },
};

/**
 * 9. Attached Create Order Screen (Launched via New Order)
 * Demonstrates the full Admin Order Creation Form that is linked when "New Order" is chosen.
 */
export const AttachedCreateOrderForm: Story = {
  name: '9. Attached Create Order Form (via New Order)',
  decorators: [withFormFactor('mobile', 'Attached Create Order Form')],
  args: {
    disableSafeArea: true,
    initialView: 'create-order',
  },
};

/**
 * 10. Attached Order ID Generator & Existing Orders (Launched via Edit Order)
 * Demonstrates the linked Generate ID screen giving access to existing orders, search filtering,
 * and order editing, with back navigation returning to Operations Hub.
 */
export const AttachedEditOrderLookup: Story = {
  name: '10. Attached Existing Orders & Generator (via Edit Order)',
  decorators: [withFormFactor('mobile', 'Attached Existing Orders & ID Generator')],
  args: {
    disableSafeArea: true,
    initialView: 'edit-order',
  },
};



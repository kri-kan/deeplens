import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { StoreConfigurationStudioPage } from '../../components/pages/StoreConfigurationStudioPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<typeof StoreConfigurationStudioPage> = {
  title: 'Pages/Admin/Store - Configuration Studio',
  component: StoreConfigurationStudioPage,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    ...THEME_ARGS,
    initialSku: 'VF2B56',
    initialPreset: 'treatment',
    initialDevice: 'mobile',
    initialDrawerOpen: true,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    initialSku: {
      control: 'select',
      options: ['VF2B56', 'VF2F4A', 'VF2F4F'],
    },
    initialPreset: {
      control: 'radio',
      options: ['control', 'treatment', 'mobile_flush'],
    },
    initialDevice: {
      control: 'radio',
      options: ['mobile', 'tablet', 'desktop'],
    },
    initialDrawerOpen: {
      control: 'boolean',
    },
  },
};
export default meta;
type Story = StoryObj<typeof StoreConfigurationStudioPage>;

/**
 * Default Merchandising Workbench:
 * Starts in Treatment (Variant B) preset on Mobile (390px) with the configuration drawer open.
 * Allows instant live toggling of views chip, ratings badge, collapsible description,
 * collapsible specifications, and modular discovery rails.
 */
export const DefaultWorkbench: Story = {
  name: 'Store Configuration Studio · Default Workbench (Mobile · Treatment)',
  args: {
    initialSku: 'VF2B56',
    initialPreset: 'treatment',
    initialDevice: 'mobile',
    initialDrawerOpen: true,
  },
};

/**
 * Mobile Flush Variant Workbench:
 * Starts in Variant C (Mobile Flush) preset on Mobile (390px).
 * Demonstrates the borderless edge-to-edge layout where all section containers are removed
 * to reclaim margins, with live controls in the studio drawer.
 */
export const PresetMobileFlush: Story = {
  name: 'Store Configuration Studio · Variant C Mobile Flush (390px Edge-to-Edge)',
  args: {
    initialSku: 'VF2B56',
    initialPreset: 'mobile_flush',
    initialDevice: 'mobile',
    initialDrawerOpen: true,
  },
};

/**
 * Control Variant Comparison on Desktop:
 * Starts in Control (Variant A) preset on Desktop (1240px) showing classic heritage layout:
 * full description, expanded specifications, ratings badge without views count.
 */
export const VariantAControlComparison: Story = {
  name: 'Store Configuration Studio · Control Variant A (Desktop 1240px)',
  args: {
    initialSku: 'VF2B56',
    initialPreset: 'control',
    initialDevice: 'desktop',
    initialDrawerOpen: true,
  },
};

/**
 * Tablet Device Simulator:
 * Demonstrates live configuration on iPad / Tablet viewport (768px).
 */
export const TabletDeviceSimulator: Story = {
  name: 'Store Configuration Studio · Tablet Simulation (768px)',
  args: {
    initialSku: 'VF2F4A',
    initialPreset: 'treatment',
    initialDevice: 'tablet',
    initialDrawerOpen: true,
  },
};

/**
 * Canvas Focused Mode (Drawer Collapsed):
 * Starts with drawer collapsed for full immersive review of the configured PDP.
 */
export const CanvasFocusedMode: Story = {
  name: 'Store Configuration Studio · Immersive Canvas (Drawer Closed)',
  args: {
    initialSku: 'VF2B56',
    initialPreset: 'treatment',
    initialDevice: 'mobile',
    initialDrawerOpen: false,
  },
};

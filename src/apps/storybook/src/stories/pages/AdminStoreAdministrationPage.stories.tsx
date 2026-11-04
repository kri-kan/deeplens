import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { AdminStoreAdministrationPage } from '@/components/tamagui-ui/pages/AdminStoreAdministrationPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { DeviceFleetStats } from '@/services/storeAdminService';

const mockStats: DeviceFleetStats = {
  totalDevices: 148,
  activeToday: 42,
  activeLast7Days: 98,
  platformBreakdown: {
    android: 84,
    ios: 42,
    web: 22,
  },
  topSignalTypes: {
    page_view: 420,
    swatch_click: 180,
    bag_add: 64,
  },
  recentDevices: [],
};

const meta: Meta<any> = {
  title: 'Pages/Admin/Storefront Administration',
  component: AdminStoreAdministrationPage,
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    stats: mockStats,
    loading: false,
    refreshing: false,
    onBack: () => alert('Back pressed'),
    onRefresh: () => alert('Refresh pressed'),
    onNavigateToDevices: () => alert('Navigating to Fleet & Devices (/store/devices)'),
    onNavigateToDevicesList: () => alert('Navigating to Hardware Directory (/store/devices/list)'),
    onNavigateToInventory: () => alert('Navigating to Store Inventory (/store/inventory)'),
    onNavigateToPublish: () => alert('Navigating to Publish Batch (/store/publish)'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof AdminStoreAdministrationPage>;

export const DefaultOverview: Story = {
  name: '1. Storefront Administration Overview (Live Telemetry)',
};

export const LoadingState: Story = {
  name: '2. Loading State (Ingesting Telemetry)',
  args: {
    stats: null,
    loading: true,
  },
};


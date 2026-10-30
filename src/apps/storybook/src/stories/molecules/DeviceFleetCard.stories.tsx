import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { DeviceFleetCard } from '@/components/tamagui-ui/molecules/DeviceFleetCard/DeviceFleetCard';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { StoreDeviceItem } from '@/services/storeAdminService';

const mockDesktopDevice: StoreDeviceItem = {
  deviceId: 'dev_c9e93a60_mvp4uova',
  fingerprintHash: 'fp_c9e93a60',
  platform: 'web',
  os: 'Linux (Ubuntu 24.04)',
  model: 'Desktop PC',
  browser: 'Chrome 131',
  screenResolution: '1920x1080@1',
  firstSeenAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  lastSeenAt: new Date(Date.now() - 60000 * 5).toISOString(),
  lastIp: '2406:b400:28:8129:ffc7:10cb:3526:6450',
  lastUserId: 'usr_priya_vip',
  totalEvents: 14,
};

const mockAndroidDevice: StoreDeviceItem = {
  deviceId: 'dev_lxpb7o4gmuu7hhaq',
  fingerprintHash: 'fp_a3a591b4',
  platform: 'android',
  os: 'Android 14',
  model: 'Nothing Phone (2)',
  browser: 'Chrome Mobile 130',
  screenResolution: '412x915@2.625',
  firstSeenAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  lastSeenAt: new Date(Date.now() - 60000 * 2).toISOString(),
  lastIp: '2406:b400:28:8129:d84c:2cec:d5b8:a4a6',
  lastUserId: undefined,
  totalEvents: 28,
};

const mockPWADevice: StoreDeviceItem = {
  deviceId: 'dev_pwa_9102ab84',
  fingerprintHash: 'fp_pwa9102',
  platform: 'pwa',
  os: 'iOS 18.1',
  model: 'iPhone 15 Pro',
  browser: 'Safari PWA Standalone',
  screenResolution: '393x852@3',
  firstSeenAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  lastSeenAt: new Date(Date.now() - 60000 * 45).toISOString(),
  lastIp: '49.207.210.45',
  lastUserId: 'usr_ananya_chennai',
  totalEvents: 42,
};

const meta: Meta<any> = {
  title: 'Molecules/DeviceFleetCard',
  component: DeviceFleetCard,
  args: {
    ...THEME_ARGS,
    device: mockAndroidDevice,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof DeviceFleetCard>;

export const AndroidPhone: Story = {
  name: '1. Android Mobile (Nothing Phone)',
  args: {
    device: mockAndroidDevice,
  },
};

export const DesktopBrowser: Story = {
  name: '2. Desktop Web (PC & Chrome)',
  args: {
    device: mockDesktopDevice,
  },
};

export const PWAStandalone: Story = {
  name: '3. iOS PWA Standalone App',
  args: {
    device: mockPWADevice,
  },
};

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { AdminDeviceFleetDashboardPage } from '@/components/tamagui-ui/pages/AdminDeviceFleetDashboardPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import {
  DeviceFleetStats,
  StoreDeviceItem,
  HourlyActivitySummary,
  DailyGrowthSummary,
} from '@/services/storeAdminService';

const mockGrowth: DailyGrowthSummary = {
  dailyRecords: [
    { date: '2026-10-22', dateLabel: 'Oct 22', dayOfWeek: 'Thu', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-23', dateLabel: 'Oct 23', dayOfWeek: 'Fri', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-24', dateLabel: 'Oct 24', dayOfWeek: 'Sat', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-25', dateLabel: 'Oct 25', dayOfWeek: 'Sun', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-26', dateLabel: 'Oct 26', dayOfWeek: 'Mon', newDevices: 27, newUsers: 3, cumulativeDevices: 27, cumulativeUsers: 3 },
    { date: '2026-10-27', dateLabel: 'Oct 27', dayOfWeek: 'Tue', newDevices: 54, newUsers: 0, cumulativeDevices: 81, cumulativeUsers: 3 },
    { date: '2026-10-28', dateLabel: 'Oct 28', dayOfWeek: 'Wed', newDevices: 64, newUsers: 0, cumulativeDevices: 145, cumulativeUsers: 3 },
  ],
  totalNewDevices: 145,
  totalNewUsers: 3,
  daysAnalyzed: 7,
  rangeAnalyzed: 7,
  granularity: 'day',
  peakNewDevicesDate: 'Oct 28',
  peakNewUsersDate: 'Oct 26',
};

const mockDevices: StoreDeviceItem[] = [
  {
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
  },
  {
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
  },
  {
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
  },
];

const mockStats: DeviceFleetStats = {
  totalDevices: 3,
  activeToday: 3,
  activeLast7Days: 3,
  platformBreakdown: {
    android: 1,
    web: 1,
    pwa: 1,
  },
  topSignalTypes: {
    session_start: 12,
    product_viewed: 8,
    add_to_bag: 5,
    cart_shared_whatsapp: 3,
    swatch_selected: 6,
  },
  recentDevices: mockDevices,
};

const mockActivity: HourlyActivitySummary = {
  distribution: Array.from({ length: 24 }, (_, h) => {
    let events = 0;
    if (h >= 11 && h <= 14) events = 18;
    else if (h >= 18 && h <= 21) events = 32;
    else if (h >= 8 && h < 11) events = 8;
    else events = 2;

    const period = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    return {
      hourIst: h,
      hourLabel: `${h.toString().padStart(2, '0')}:00 (${period})`,
      activeDevices: Math.max(1, Math.round(events / 4)),
      activeUsers: Math.max(0, Math.round(events / 6)),
      totalEvents: events,
      percentageOfDailyTraffic: Math.round((events / 220) * 100),
    };
  }),
  peakHourIst: 20,
  peakHourLabel: '20:00 IST (8 PM)',
  totalEventsLast30Days: 4850,
  uniqueDevicesLast30Days: 142,
  historicalHoursRetained: 720,
};

const meta: Meta<any> = {
  title: 'Pages/Admin/Device Fleet & Telemetry',
  component: AdminDeviceFleetDashboardPage,
  decorators: [withFormFactor('mobile', 'Vayyari Fleet Intelligence (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    stats: mockStats,
    recentDevices: mockDevices,
    hourlyActivity: mockActivity,
    dailyGrowth: mockGrowth,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof AdminDeviceFleetDashboardPage>;

export const ActiveFleetOverview: Story = {
  name: '1. Active Fleet Intelligence (Live Devices & 24h Peak Chart)',
  args: {
    stats: mockStats,
    recentDevices: mockDevices,
    hourlyActivity: mockActivity,
    dailyGrowth: mockGrowth,
  },
};

export const FilteredAndroid: Story = {
  name: '2. Filtered: Android Devices Only',
  args: {
    stats: mockStats,
    recentDevices: [mockDevices[1]],
    hourlyActivity: mockActivity,
    dailyGrowth: mockGrowth,
  },
};

export const LoadingState: Story = {
  name: '3. Initial Loading State',
  args: {
    stats: null,
    recentDevices: [],
    hourlyActivity: null,
    loading: true,
  },
};

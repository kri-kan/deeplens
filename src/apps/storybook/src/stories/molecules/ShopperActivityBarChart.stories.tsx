import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ShopperActivityBarChart } from '@/components/tamagui-ui/molecules/ShopperActivityBarChart/ShopperActivityBarChart';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { HourlyActivitySummary } from '@/services/storeAdminService';

const mockActivitySummary: HourlyActivitySummary = {
  distribution: Array.from({ length: 24 }, (_, h) => {
    // Generate realistic evening-peaked traffic curve
    let events = 0;
    if (h >= 11 && h <= 14) events = Math.round(15 + (h - 11) * 8);
    else if (h >= 18 && h <= 22) events = Math.round(35 + (22 - h) * 12);
    else if (h >= 8 && h < 11) events = Math.round(5 + (h - 8) * 3);
    else if (h >= 23 || h <= 2) events = Math.round(4);
    else events = 1;

    const period = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    return {
      hourIst: h,
      hourLabel: `${h.toString().padStart(2, '0')}:00 (${period})`,
      activeDevices: Math.max(1, Math.round(events / 3)),
      activeUsers: Math.max(0, Math.round(events / 5)),
      totalEvents: events,
      percentageOfDailyTraffic: Math.round((events / 280) * 100),
    };
  }),
  peakHourIst: 20,
  peakHourLabel: '20:00 IST (8 PM)',
  totalEventsLast30Days: 4850,
  uniqueDevicesLast30Days: 142,
  historicalHoursRetained: 720,
};

const meta: Meta<any> = {
  title: 'Molecules/ShopperActivityBarChart',
  component: ShopperActivityBarChart,
  args: {
    ...THEME_ARGS,
    activity: mockActivitySummary,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof ShopperActivityBarChart>;

export const EveningPeak: Story = {
  name: '1. Standard Traffic Curve (Evening 8 PM Peak)',
  args: {
    activity: mockActivitySummary,
  },
};

export const ZeroTraffic: Story = {
  name: '2. Zero Signals (New Store Instance)',
  args: {
    activity: {
      distribution: Array.from({ length: 24 }, (_, h) => ({
        hourIst: h,
        hourLabel: `${h.toString().padStart(2, '0')}:00`,
        activeDevices: 0,
        activeUsers: 0,
        totalEvents: 0,
        percentageOfDailyTraffic: 0,
      })),
      peakHourIst: 0,
      peakHourLabel: '00:00 IST',
      totalEventsLast30Days: 0,
      uniqueDevicesLast30Days: 0,
      historicalHoursRetained: 0,
    },
  },
};

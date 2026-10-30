import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { DailyAcquisitionsGraph } from '@/components/tamagui-ui/molecules/DailyAcquisitionsGraph/DailyAcquisitionsGraph';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { DailyGrowthSummary } from '@/services/storeAdminService';

const mockDayGrowth10Bars: DailyGrowthSummary = {
  dailyRecords: [
    { date: '2026-10-20', dateLabel: 'Oct 20', dayOfWeek: 'Tue', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-21', dateLabel: 'Oct 21', dayOfWeek: 'Wed', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-22', dateLabel: 'Oct 22', dayOfWeek: 'Thu', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-23', dateLabel: 'Oct 23', dayOfWeek: 'Fri', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-24', dateLabel: 'Oct 24', dayOfWeek: 'Sat', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-25', dateLabel: 'Oct 25', dayOfWeek: 'Sun', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-26', dateLabel: 'Oct 26', dayOfWeek: 'Mon', newDevices: 27, newUsers: 3, cumulativeDevices: 27, cumulativeUsers: 3 },
    { date: '2026-10-27', dateLabel: 'Oct 27', dayOfWeek: 'Tue', newDevices: 54, newUsers: 0, cumulativeDevices: 81, cumulativeUsers: 3 },
    { date: '2026-10-28', dateLabel: 'Oct 28', dayOfWeek: 'Wed', newDevices: 67, newUsers: 0, cumulativeDevices: 148, cumulativeUsers: 3 },
    { date: '2026-10-29', dateLabel: 'Oct 29', dayOfWeek: 'Thu', newDevices: 1, newUsers: 0, cumulativeDevices: 149, cumulativeUsers: 3 },
  ],
  totalNewDevices: 149,
  totalNewUsers: 3,
  daysAnalyzed: 10,
  rangeAnalyzed: 10,
  granularity: 'day',
  peakNewDevicesDate: 'Oct 28',
  peakNewUsersDate: 'Oct 26',
};

const mockWeekGrowth10Bars: DailyGrowthSummary = {
  dailyRecords: [
    { date: '2026-08-24', dateLabel: 'Wk of Aug 24', dayOfWeek: 'W35', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-08-31', dateLabel: 'Wk of Aug 31', dayOfWeek: 'W36', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-09-07', dateLabel: 'Wk of Sep 07', dayOfWeek: 'W37', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-09-14', dateLabel: 'Wk of Sep 14', dayOfWeek: 'W38', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-09-21', dateLabel: 'Wk of Sep 21', dayOfWeek: 'W39', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-09-28', dateLabel: 'Wk of Sep 28', dayOfWeek: 'W40', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-05', dateLabel: 'Wk of Oct 05', dayOfWeek: 'W41', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-12', dateLabel: 'Wk of Oct 12', dayOfWeek: 'W42', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-19', dateLabel: 'Wk of Oct 19', dayOfWeek: 'W43', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-26', dateLabel: 'Wk of Oct 26', dayOfWeek: 'W44', newDevices: 149, newUsers: 3, cumulativeDevices: 149, cumulativeUsers: 3 },
  ],
  totalNewDevices: 149,
  totalNewUsers: 3,
  daysAnalyzed: 10,
  rangeAnalyzed: 10,
  granularity: 'week',
  peakNewDevicesDate: 'Wk of Oct 26',
  peakNewUsersDate: 'Wk of Oct 26',
};

const mockMonthGrowth10Bars: DailyGrowthSummary = {
  dailyRecords: [
    { date: '2026-01-01', dateLabel: 'Jan 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-02-01', dateLabel: 'Feb 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-03-01', dateLabel: 'Mar 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-04-01', dateLabel: 'Apr 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-05-01', dateLabel: 'May 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-06-01', dateLabel: 'Jun 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-07-01', dateLabel: 'Jul 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-08-01', dateLabel: 'Aug 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-09-01', dateLabel: 'Sep 2026', dayOfWeek: '2026', newDevices: 0, newUsers: 0, cumulativeDevices: 0, cumulativeUsers: 0 },
    { date: '2026-10-01', dateLabel: 'Oct 2026', dayOfWeek: '2026', newDevices: 149, newUsers: 3, cumulativeDevices: 149, cumulativeUsers: 3 },
  ],
  totalNewDevices: 149,
  totalNewUsers: 3,
  daysAnalyzed: 10,
  rangeAnalyzed: 10,
  granularity: 'month',
  peakNewDevicesDate: 'Oct 2026',
  peakNewUsersDate: 'Oct 2026',
};

const meta: Meta<any> = {
  title: 'Molecules/DailyAcquisitionsGraph',
  component: DailyAcquisitionsGraph,
  args: {
    ...THEME_ARGS,
    growth: mockDayGrowth10Bars,
    granularity: 'day',
    range: 10,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof DailyAcquisitionsGraph>;

export const DayProjection10Bars: Story = {
  name: '1. Day Projection (Latest 10 Days Default)',
  args: {
    growth: mockDayGrowth10Bars,
    granularity: 'day',
    range: 10,
  },
};

export const WeekProjection10Bars: Story = {
  name: '2. Week Projection (Latest 10 Weeks Default)',
  args: {
    growth: mockWeekGrowth10Bars,
    granularity: 'week',
    range: 10,
  },
};

export const MonthProjection10Bars: Story = {
  name: '3. Month Projection (Latest 10 Months Default)',
  args: {
    growth: mockMonthGrowth10Bars,
    granularity: 'month',
    range: 10,
  },
};

export const LoadingState: Story = {
  name: '4. Loading / Skeleton',
  args: {
    growth: null,
    loading: true,
  },
};

export const EmptyState: Story = {
  name: '5. Empty / Zero Acquisitions',
  args: {
    growth: {
      dailyRecords: [],
      totalNewDevices: 0,
      totalNewUsers: 0,
      daysAnalyzed: 10,
      rangeAnalyzed: 10,
      granularity: 'day',
    },
    loading: false,
  },
};

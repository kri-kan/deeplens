import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import {
  IOSWheelDateTimePicker,
  formatIOSScheduleDateTime,
} from '../../components/molecules/IOSWheelDateTimePicker';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/IOSWheelDateTimePicker',
  component: IOSWheelDateTimePicker,
  decorators: [
    withFormFactor('mobile', 'iOS Style Drum-Roll Wheel Picker (Mobile 390px)'),
    (Story) => (
      <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <Story />
      </View>
    ),
  ],
  args: {
    ...THEME_ARGS,
    selectedDate: '2026-09-10',
    selectedDayPart: 'evening',
    showDoneButton: true,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    selectedDate: {
      control: 'text',
      description: 'Preselected date in YYYY-MM-DD format',
    },
    selectedDayPart: {
      control: 'select',
      options: ['morning', 'afternoon', 'evening', 'night'],
      description: 'Day-part preset timing slot',
    },
    showDoneButton: {
      control: 'boolean',
      description: 'Show iOS top header bar with Cancel/Done action',
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * 1. Default Interactive Drum-Roll Wheel:
 * Authentic iOS UIDatePicker drum-roll wheel with snapping and centered frosted glass selection band.
 */
export const DefaultInteractiveWheel: Story = {
  name: '1. Interactive Drum-Roll Wheel (Today & Evening Preselected)',
  args: {
    selectedDate: '2026-09-10',
    selectedDayPart: 'evening',
  },
};

/**
 * 2. Morning Slot Preselected:
 * Selected slot at Morning (11:00 AM) for morning drop campaigns.
 */
export const MorningDropSlot: Story = {
  name: '2. Morning Drop Slot (11:00 AM)',
  args: {
    selectedDate: '2026-09-11',
    selectedDayPart: 'morning',
  },
};

/**
 * 3. Night Slot Preselected:
 * Selected slot at Night (09:00 PM) for prime-time Instagram engagement.
 */
export const NightPrimeSlot: Story = {
  name: '3. Night Prime Slot (09:00 PM)',
  args: {
    selectedDate: '2026-09-12',
    selectedDayPart: 'night',
  },
};

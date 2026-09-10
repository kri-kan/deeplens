import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import {
  MaterialDateTimePicker,
  formatMaterialScheduleDateTime,
} from '../../components/molecules/MaterialDateTimePicker';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/MaterialDateTimePicker',
  component: MaterialDateTimePicker,
  decorators: [
    withFormFactor('mobile', 'Android Material 3 Date & Time Picker (Mobile 390px)'),
    (Story) => (
      <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <Story />
      </View>
    ),
  ],
  args: {
    ...THEME_ARGS,
    selectedDate: '2026-09-18',
    selectedDayPart: 'evening',
    showActionBar: true,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    selectedDate: {
      control: 'text',
      description: 'Selected date in YYYY-MM-DD format',
    },
    selectedDayPart: {
      control: 'select',
      options: ['morning', 'afternoon', 'evening', 'night'],
      description: 'Day-part preset timing slot',
    },
    showActionBar: {
      control: 'boolean',
      description: 'Show Cancel / Set Schedule bottom action bar',
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * 1. Default Interactive Material 3 Date & Time Dialog:
 * Features top header banner with selected date & timing badge, clean monthly calendar matrix,
 * day-part chips, and Cancel / Set Schedule actions.
 */
export const DefaultMaterialDialog: Story = {
  name: '1. Interactive Material 3 Dialog (Sep 18 & Evening)',
  args: {
    selectedDate: '2026-09-18',
    selectedDayPart: 'evening',
  },
};

/**
 * 2. Morning Drop Slot Selected:
 * Material 3 calendar with 11:00 AM Morning slot preselected.
 */
export const MorningDropSlot: Story = {
  name: '2. Morning Drop Slot (11:00 AM)',
  args: {
    selectedDate: '2026-09-19',
    selectedDayPart: 'morning',
  },
};

/**
 * 3. Night Prime Slot Selected:
 * Material 3 calendar with 09:00 PM Night slot preselected.
 */
export const NightPrimeSlot: Story = {
  name: '3. Night Prime Slot (09:00 PM)',
  args: {
    selectedDate: '2026-09-20',
    selectedDayPart: 'night',
  },
};

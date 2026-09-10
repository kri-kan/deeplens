import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import {
  ScheduleCalendarTimePicker,
  DAY_PART_PRESETS,
  DayPartSlot,
} from '../../components/molecules/ScheduleCalendarTimePicker';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

function PickerInteractiveWrapper(props: any) {
  const [date, setDate] = useState(props.selectedDate || '2026-09-15');
  const [slot, setSlot] = useState<DayPartSlot>(props.selectedDayPart || 'evening');

  return (
    <View style={{ padding: 16, maxWidth: 390, alignSelf: 'center', width: '100%' }}>
      <ScheduleCalendarTimePicker
        {...props}
        selectedDate={date}
        selectedDayPart={slot}
        onDateChange={setDate}
        onDayPartChange={(s) => setSlot(s)}
      />
    </View>
  );
}

const meta: Meta<any> = {
  title: 'Molecules/ScheduleCalendarTimePicker',
  component: ScheduleCalendarTimePicker,
  decorators: [withFormFactor('mobile', 'Schedule Calendar & Day-Part Time Picker (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    selectedDate: '2026-09-15',
    selectedDayPart: 'evening',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    selectedDayPart: {
      control: 'radio',
      options: ['morning', 'afternoon', 'evening', 'night'],
      description: 'Day-part timing preset',
    },
  },
};

export default meta;
type Story = StoryObj;

export const DefaultInteractive: Story = {
  name: '1. Interactive Calendar & Day-Part Time Picker',
  render: (args) => <PickerInteractiveWrapper {...args} />,
};

export const MorningPreset: Story = {
  name: '2. Morning Slot (11:00 AM)',
  args: {
    selectedDate: '2026-09-18',
    selectedDayPart: 'morning',
  },
  render: (args) => <PickerInteractiveWrapper {...args} />,
};

export const EveningPreset: Story = {
  name: '3. Evening Slot (06:30 PM)',
  args: {
    selectedDate: '2026-09-20',
    selectedDayPart: 'evening',
  },
  render: (args) => <PickerInteractiveWrapper {...args} />,
};

export const NightPreset: Story = {
  name: '4. Night Slot (09:00 PM)',
  args: {
    selectedDate: '2026-09-25',
    selectedDayPart: 'night',
  },
  render: (args) => <PickerInteractiveWrapper {...args} />,
};

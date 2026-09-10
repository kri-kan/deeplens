import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { QuickSchedulePresetPicker } from '../../components/molecules/QuickSchedulePresetPicker';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/QuickSchedulePresetPicker',
  component: QuickSchedulePresetPicker,
  args: {
    ...THEME_ARGS,
    selectedPresetLabel: null,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const DefaultNoneSelected: Story = {
  name: '1. Default (None Selected)',
  args: {
    selectedPresetLabel: null,
  },
};

export const TomorrowSelected: Story = {
  name: '2. Preset Selected (Tomorrow 11 AM)',
  args: {
    selectedPresetLabel: 'Tomorrow 11:00 AM',
  },
};

export const InteractiveSelection: Story = {
  name: '3. Interactive (Tap Preset to Select)',
  render: () => {
    const [selected, setSelected] = useState<string | null>('Today 6:00 PM');
    return (
      <QuickSchedulePresetPicker
        selectedPresetLabel={selected}
        onSelectPreset={(label) => setSelected(label)}
      />
    );
  },
};

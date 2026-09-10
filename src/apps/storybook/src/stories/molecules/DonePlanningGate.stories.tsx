import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { DonePlanningGate } from '../../components/molecules/DonePlanningGate';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/DonePlanningGate',
  component: DonePlanningGate,
  args: {
    ...THEME_ARGS,
    isDonePlanning: false,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    isDonePlanning: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <View style={{ maxWidth: 420, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const InDraftState: Story = {
  name: '1. In Draft (Keep in Curation)',
  args: {
    isDonePlanning: false,
  },
};

export const CompletedState: Story = {
  name: '2. Complete (Ready in Queues)',
  args: {
    isDonePlanning: true,
  },
};

export const InteractiveToggle: Story = {
  name: '3. Interactive (Tap Pill to Toggle)',
  render: () => {
    const [done, setDone] = useState(false);
    return <DonePlanningGate isDonePlanning={done} onToggle={setDone} />;
  },
};

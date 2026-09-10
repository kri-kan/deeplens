import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { TargetChannelEligibilityPicker } from '../../components/molecules/TargetChannelEligibilityPicker';
import { TargetChannelOption } from '../../components/molecules/post-planner.types';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const MOCK_CHANNELS: TargetChannelOption[] = [
  {
    id: 'ch-1',
    username: 'vayyari_fashions',
    channelType: 'focus',
    niche: 'Core Luxury Festive Wear',
    avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  },
  {
    id: 'ch-2',
    username: 'dressbyvayyari',
    channelType: 'focus',
    niche: 'Kurtis, Anarkalis & Dresses',
    avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
  },
  {
    id: 'ch-3',
    username: 'saree_dump',
    channelType: 'dump',
    niche: 'Silk & Handloom Saree Curation',
    avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
  },
  {
    id: 'ch-4',
    username: 'fusion_edits_dump',
    channelType: 'dump',
    niche: 'Modern Western & Fusion Wear',
    avatarUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  },
];

const meta: Meta<any> = {
  title: 'Molecules/TargetChannelEligibilityPicker',
  component: TargetChannelEligibilityPicker,
  args: {
    ...THEME_ARGS,
    channels: MOCK_CHANNELS,
    selectedChannelIds: ['ch-1', 'ch-3'],
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const PartialSelection: Story = {
  name: '1. Partial Selection (2 Channels Selected)',
  args: {
    selectedChannelIds: ['ch-1', 'ch-3'],
  },
};

export const NoneSelected: Story = {
  name: '2. None Selected (Zero Allocated)',
  args: {
    selectedChannelIds: [],
  },
};

export const AllSelected: Story = {
  name: '3. All Channels Selected (Full Broadcast)',
  args: {
    selectedChannelIds: ['ch-1', 'ch-2', 'ch-3', 'ch-4'],
  },
};

export const Interactive: Story = {
  name: '4. Interactive (Tap Avatars to Toggle)',
  render: () => {
    const [selected, setSelected] = useState<string[]>(['ch-1', 'ch-3']);
    return (
      <TargetChannelEligibilityPicker
        channels={MOCK_CHANNELS}
        selectedChannelIds={selected}
        onToggleChannel={(id) =>
          setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        }
      />
    );
  },
};

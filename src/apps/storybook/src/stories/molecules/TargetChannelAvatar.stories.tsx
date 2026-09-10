import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { TargetChannelAvatar } from '../../components/molecules/TargetChannelAvatar';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/TargetChannelAvatar',
  component: TargetChannelAvatar,
  args: {
    ...THEME_ARGS,
    isSelected: false,
    size: 'md',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    isSelected: { control: 'boolean' },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj;

export const FocusChannel: Story = {
  name: '1. Focus Channel (Default)',
  args: {
    channel: {
      id: 'ch-1',
      username: 'vayyari_fashions',
      channelType: 'focus',
      niche: 'Core Luxury Festive Wear',
      avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    },
    isSelected: false,
  },
};

export const FocusChannelSelected: Story = {
  name: '2. Focus Channel (Selected with Badge)',
  args: {
    channel: {
      id: 'ch-1',
      username: 'vayyari_fashions',
      channelType: 'focus',
      niche: 'Core Luxury Festive Wear',
      avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    },
    isSelected: true,
  },
};

export const DumpChannel: Story = {
  name: '3. Dump Channel (Dashed Border)',
  args: {
    channel: {
      id: 'ch-3',
      username: 'saree_dump',
      channelType: 'dump',
      niche: 'Silk & Handloom Saree Curation',
      avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    },
    isSelected: false,
  },
};

export const DumpChannelSelected: Story = {
  name: '4. Dump Channel (Selected with Badge)',
  args: {
    channel: {
      id: 'ch-3',
      username: 'saree_dump',
      channelType: 'dump',
      niche: 'Silk & Handloom Saree Curation',
      avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    },
    isSelected: true,
  },
};

export const WithoutAvatarFallback: Story = {
  name: '5. Initial Fallback (No Avatar Image)',
  args: {
    channel: {
      id: 'ch-2',
      username: 'dressbyvayyari',
      channelType: 'focus',
      niche: 'Kurtis, Anarkalis & Dresses',
    },
    isSelected: false,
  },
};

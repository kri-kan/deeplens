import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { ActiveProfileCard } from '../../components/molecules/ActiveProfileCard';
import { InstagramExplorerProfile } from '../../components/molecules/instagram-explorer.types';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const MOCK_PROFILE_PINNED: InstagramExplorerProfile = {
  id: 'p-1',
  username: 'vayyari_fashions',
  fullName: 'Vayyari Fashions',
  avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  isPinned: true,
  isActive: true,
  profileCategory: 'mybusiness',
};

const MOCK_PROFILE_UNPINNED: InstagramExplorerProfile = {
  id: 'p-2',
  username: 'dressbyvayyari',
  fullName: 'Dress by Vayyari',
  avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
  isPinned: false,
  isActive: true,
  profileCategory: 'mybusiness',
};

const meta: Meta<any> = {
  title: 'Molecules/ActiveProfileCard',
  component: ActiveProfileCard,
  args: {
    ...THEME_ARGS,
    profile: MOCK_PROFILE_PINNED,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const PinnedProfile: Story = {
  name: '1. Pinned Active Profile',
  args: {
    profile: MOCK_PROFILE_PINNED,
  },
};

export const StandardProfile: Story = {
  name: '2. Standard Active Profile',
  args: {
    profile: MOCK_PROFILE_UNPINNED,
  },
};

export const FallbackAvatar: Story = {
  name: '3. Fallback Monogram Avatar',
  args: {
    profile: {
      ...MOCK_PROFILE_UNPINNED,
      username: 'vayyari_prive',
      avatarUri: undefined,
    },
  },
};

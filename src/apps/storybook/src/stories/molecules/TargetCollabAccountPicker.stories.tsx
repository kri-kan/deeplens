import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  TargetCollabAccountPicker,
  TargetCollabAccount,
} from '../../components/molecules/TargetCollabAccountPicker';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

export const MOCK_COLLAB_ACCOUNTS: TargetCollabAccount[] = [
  {
    id: 'p-1',
    username: 'vayyari_fashions',
    displayName: 'Vayyari Fashions',
    avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-2',
    username: 'dressbyvayyari',
    displayName: 'Dress by Vayyari',
    avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-3',
    username: 'eclipsevayyari',
    displayName: 'Eclipse Vayyari',
    avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-4',
    username: 'editionsbyvayyari',
    displayName: 'Editions by Vayyari',
    avatarUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-5',
    username: 'everydayvayyari',
    displayName: 'Everyday Vayyari',
    avatarUri: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-6',
    username: 'theblouseedition',
    displayName: 'The Blouse Edition',
    avatarUri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-7',
    username: 'vayyari_littles',
    displayName: 'Vayyari Littles',
    avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-8',
    username: 'vayyariplusyou',
    displayName: 'Vayyari Plus You',
    avatarUri: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-9',
    username: 'vayyari_prive',
    displayName: 'Vayyari Privé',
    avatarUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    channelType: 'focus',
  },
  {
    id: 'p-10',
    username: 'vayyaristudio',
    displayName: 'Vayyari Studio',
    avatarUri: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
    channelType: 'focus',
  },
];

const meta: Meta<any> = {
  title: 'Molecules/TargetCollabAccountPicker',
  component: TargetCollabAccountPicker,
  args: {
    ...THEME_ARGS,
    accounts: MOCK_COLLAB_ACCOUNTS,
    selectedAccountIds: ['p-1', 'p-4', 'p-5'],
    maxSelections: 5,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const DefaultThreeSelected: Story = {
  name: '1. Three Selected (3 / 5)',
  args: {
    selectedAccountIds: ['p-1', 'p-4', 'p-5'],
  },
};

export const MaxFiveSelected: Story = {
  name: '2. Max 5 Accounts Selected (Instagram Hard Limit)',
  args: {
    selectedAccountIds: ['p-1', 'p-2', 'p-4', 'p-5', 'p-6'],
  },
};

export const NoneSelected: Story = {
  name: '3. Empty (0 / 5 Selected)',
  args: {
    selectedAccountIds: [],
  },
};

export const InteractivePicker: Story = {
  name: '4. Interactive Workbench (Click to Select / Deselect)',
  render: (args: any) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(args.selectedAccountIds || ['p-1']);
    return (
      <TargetCollabAccountPicker
        {...args}
        selectedAccountIds={selectedIds}
        onToggleAccount={(id) => {
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          );
        }}
      />
    );
  },
};

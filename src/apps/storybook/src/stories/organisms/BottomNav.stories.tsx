import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { YStack, Text } from 'tamagui';
import { BottomNav, BottomNavTab } from '../../components/organisms/BottomNav';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/BottomNav',
  component: BottomNav,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const MobilePreview = () => {
  const [tab, setTab] = useState<BottomNavTab>('home');

  return (
    <YStack
      width={360}
      height={300}
      backgroundColor="#F8F9FA"
      justifyContent="space-between"
      borderWidth={1}
      borderColor="#E0E0E0"
      borderRadius={16}
      overflow="hidden"
      margin="auto"
    >
      <YStack padding={16} alignItems="center" justifyContent="center" flex={1}>
        <Text fontSize={16} fontWeight="700">
          Active Screen: {tab.toUpperCase()}
        </Text>
        <Text fontSize={12} color="#757575" marginTop={4}>
          Tap tabs below to switch
        </Text>
      </YStack>

      <BottomNav
        activeTab={tab}
        onTabChange={setTab}
        showProfileNotification={true}
        profileBadgeText="NEW"
      />
    </YStack>
  );
};

export const CurationsActive = () => (
  <YStack width={360} margin="auto">
    <BottomNav activeTab="curations" onTabChange={() => {}} />
  </YStack>
);

export const ProfileActive = () => (
  <YStack width={360} margin="auto">
    <BottomNav activeTab="profile" onTabChange={() => {}} showProfileNotification={false} />
  </YStack>
);

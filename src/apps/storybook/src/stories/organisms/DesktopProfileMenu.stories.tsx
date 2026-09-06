import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { YStack, Button } from 'tamagui';
import { DesktopProfileMenu } from '../../components/organisms/DesktopProfileMenu';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/DesktopProfileMenu',
  component: DesktopProfileMenu,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const GuestState = () => (
  <YStack padding={24} alignItems="center">
    <DesktopProfileMenu
      onLoginClick={() => alert('Trigger Login Sheet')}
      onItemClick={(k) => alert(`Navigate to: ${k}`)}
    />
  </YStack>
);

export const LoggedInState = () => (
  <YStack padding={24} alignItems="center">
    <DesktopProfileMenu
      user={{
        name: 'Krikan Sharma',
        phone: '+91 98765 43210',
        tier: 'VIP Gold',
      }}
      onLogoutClick={() => alert('Logged out')}
      onItemClick={(k) => alert(`Navigate to: ${k}`)}
    />
  </YStack>
);

export const InteractiveHoverSimulation = () => {
  const [isHovered, setIsHovered] = useState(true);
  const [user, setUser] = useState<{ name: string; phone: string; tier?: string } | null>(null);

  return (
    <YStack padding={24} gap={16} alignItems="center">
      <YStack flexDirection="row" gap={10}>
        <Button size="$3" onPress={() => setUser(user ? null : { name: 'Priya Patel', phone: '+91 98123 45678', tier: 'Insider' })}>
          Toggle Auth ({user ? 'Logged In' : 'Guest'})
        </Button>
        <Button size="$3" onPress={() => setIsHovered(!isHovered)}>
          {isHovered ? 'Hide Dropdown' : 'Show Dropdown'}
        </Button>
      </YStack>

      {isHovered && (
        <DesktopProfileMenu
          user={user}
          onLoginClick={() => setUser({ name: 'Priya Patel', phone: '+91 98123 45678', tier: 'Insider' })}
          onLogoutClick={() => setUser(null)}
          onItemClick={(k) => alert(`Navigating: ${k}`)}
        />
      )}
    </YStack>
  );
};

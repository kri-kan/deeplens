import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { YStack, Button, Text } from 'tamagui';
import { AuthSheet } from '../../components/organisms/AuthSheet';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/AuthSheet',
  component: AuthSheet,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const DefaultPhoneEntry = () => {
  const [open, setOpen] = useState(true);

  return (
    <YStack padding={20} alignItems="center">
      <Button onPress={() => setOpen(true)} theme="dark">
        Open Auth Sheet
      </Button>
      <AuthSheet
        visible={open}
        onClose={() => setOpen(false)}
        onSuccess={(user) => alert(`Logged in via ${user.method}: ${user.phone}`)}
      />
    </YStack>
  );
};

export const InteractiveFlow = () => {
  const [open, setOpen] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

  return (
    <YStack padding={20} gap={12} alignItems="center">
      {loggedInUser ? (
        <YStack alignItems="center" gap={8}>
          <Text fontSize={14} fontWeight="700" color="#2E7D32">
            Successfully Authenticated: {loggedInUser}
          </Text>
          <Button size="$3" onPress={() => setLoggedInUser(null)}>
            Reset Login
          </Button>
        </YStack>
      ) : (
        <Button onPress={() => setOpen(true)} theme="dark">
          Sign In / Register
        </Button>
      )}

      <AuthSheet
        visible={open}
        onClose={() => setOpen(false)}
        onSuccess={(data) => {
          setLoggedInUser(`${data.phone} (${data.method})`);
        }}
      />
    </YStack>
  );
};

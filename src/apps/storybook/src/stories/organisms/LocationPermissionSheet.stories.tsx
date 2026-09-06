import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { YStack, Button, Text } from 'tamagui';
import { LocationPermissionSheet } from '../../components/organisms/LocationPermissionSheet';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/LocationPermissionSheet',
  component: LocationPermissionSheet,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const PermissionOff = () => {
  const [open, setOpen] = useState(true);
  return (
    <YStack padding={20} alignItems="center">
      <Button onPress={() => setOpen(true)} theme="dark">
        Open Location Sheet (Permission Off)
      </Button>
      <LocationPermissionSheet
        visible={open}
        onClose={() => setOpen(false)}
        permissionStatus="denied"
      />
    </YStack>
  );
};

export const PermissionGranted = () => {
  const [open, setOpen] = useState(true);
  return (
    <YStack padding={20} alignItems="center">
      <Button onPress={() => setOpen(true)} theme="dark">
        Open Location Sheet (Permission Granted)
      </Button>
      <LocationPermissionSheet
        visible={open}
        onClose={() => setOpen(false)}
        permissionStatus="granted"
        currentPincode="560001"
      />
    </YStack>
  );
};

export const Interactive = () => {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<'prompt' | 'denied' | 'granted'>('denied');
  const [pincode, setPincode] = useState('');

  return (
    <YStack padding={20} gap={12} alignItems="center">
      <Text fontSize={14} fontWeight="600">
        Current Pincode: {pincode || 'None'} | Permission: {status}
      </Text>
      <Button onPress={() => setOpen(true)} theme="dark">
        Open Location Selector
      </Button>
      <LocationPermissionSheet
        visible={open}
        onClose={() => setOpen(false)}
        permissionStatus={status}
        currentPincode={pincode}
        onGrantPermission={() => {
          setStatus('granted');
          setPincode('560001');
        }}
        onUseCurrentLocation={() => {
          setStatus('granted');
          setPincode('560001');
        }}
        onPincodeSubmit={(code) => {
          setPincode(code);
        }}
      />
    </YStack>
  );
};

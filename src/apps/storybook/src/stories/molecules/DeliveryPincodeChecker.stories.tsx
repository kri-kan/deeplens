import React from 'react';
import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { DeliveryPincodeChecker } from '../../components/molecules/DeliveryPincodeChecker/DeliveryPincodeChecker';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/DeliveryPincodeChecker',
  component: DeliveryPincodeChecker,
  args: {
    ...THEME_ARGS,
    initialPincode: '560001',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const WithPincode = (args: any) => (
  <View style={{ maxWidth: 640, padding: 16 }}>
    <DeliveryPincodeChecker initialPincode="560001" />
  </View>
);

export const Unset = (args: any) => (
  <View style={{ maxWidth: 640, padding: 16 }}>
    <DeliveryPincodeChecker initialPincode="" />
  </View>
);

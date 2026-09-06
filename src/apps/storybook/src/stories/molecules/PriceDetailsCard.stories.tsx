import React from 'react';
import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { PriceDetailsCard } from '../../components/molecules/PriceDetailsCard/PriceDetailsCard';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/PriceDetailsCard',
  component: PriceDetailsCard,
  args: {
    ...THEME_ARGS,
    totalMRP: 14499,
    totalDiscount: 11825,
    couponDiscount: 500,
    artisanDonation: 20,
    shippingFee: 0,
    itemCount: 2,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const Default = (args: any) => (
  <View style={{ maxWidth: 400, padding: 16 }}>
    <PriceDetailsCard {...args} onPlaceOrder={() => alert('Placing order')} />
  </View>
);

export const WithNoCoupon = (args: any) => (
  <View style={{ maxWidth: 400, padding: 16 }}>
    <PriceDetailsCard
      {...args}
      couponDiscount={0}
      onOpenCoupon={() => alert('Opening coupons modal')}
      onPlaceOrder={() => alert('Placing order')}
    />
  </View>
);

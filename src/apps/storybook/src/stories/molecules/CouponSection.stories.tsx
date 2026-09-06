import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { CouponSection } from '../../components/molecules/CouponSection/CouponSection';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/CouponSection',
  component: CouponSection,
  args: {
    ...THEME_ARGS,
    cartTotal: 2697,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const Default = (args: any) => {
  const [coupon, setCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);

  return (
    <View style={{ maxWidth: 400, padding: 16 }}>
      <CouponSection
        appliedCoupon={coupon}
        appliedDiscount={discount}
        cartTotal={args.cartTotal}
        onApplyCoupon={(code, disc) => {
          setCoupon(code);
          setDiscount(disc);
        }}
        onRemoveCoupon={() => {
          setCoupon(null);
          setDiscount(0);
        }}
      />
    </View>
  );
};

export const CouponApplied = (args: any) => (
  <View style={{ maxWidth: 400, padding: 16 }}>
    <CouponSection
      appliedCoupon="VAYYARI500"
      appliedDiscount={500}
      cartTotal={3500}
    />
  </View>
);

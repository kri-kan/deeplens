import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { MyntraStyleCartItem } from '../../components/molecules/CartItem/MyntraStyleCartItem';
import { INITIAL_CART_ITEMS } from '../../components/pages/CartPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/CartItem',
  component: MyntraStyleCartItem,
  args: {
    ...THEME_ARGS,
    item: INITIAL_CART_ITEMS[0],
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const Default = (args: any) => {
  const [item, setItem] = useState(INITIAL_CART_ITEMS[0]);

  return (
    <View style={{ maxWidth: 640, padding: 16 }}>
      <MyntraStyleCartItem
        item={item}
        onToggleSelect={() => setItem((prev) => ({ ...prev, selected: !prev.selected }))}
        onQuantityChange={(_, qty) => setItem((prev) => ({ ...prev, quantity: qty }))}
        onSizeChange={(_, sz) => setItem((prev) => ({ ...prev, size: sz }))}
      />
    </View>
  );
};

export const LowStockItem = (args: any) => {
  const [item, setItem] = useState(INITIAL_CART_ITEMS[1]);

  return (
    <View style={{ maxWidth: 640, padding: 16 }}>
      <MyntraStyleCartItem
        item={item}
        onToggleSelect={() => setItem((prev) => ({ ...prev, selected: !prev.selected }))}
      />
    </View>
  );
};

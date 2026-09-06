import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { WishlistCard } from '../../components/molecules/WishlistCard/WishlistCard';
import { INITIAL_WISHLIST_ITEMS } from '../../components/pages/WishlistPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/WishlistCard',
  component: WishlistCard,
  args: {
    ...THEME_ARGS,
    item: INITIAL_WISHLIST_ITEMS[0],
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const InStock = (args: any) => (
  <View style={{ maxWidth: 300, padding: 16 }}>
    <WishlistCard
      item={INITIAL_WISHLIST_ITEMS[0]}
      onMoveToBag={(i) => alert(`Moving ${i.name} to Bag`)}
      onRemove={() => alert('Removed from Wishlist')}
      onShare={() => alert('Sharing wishlist item')}
    />
  </View>
);

export const LowStock = (args: any) => (
  <View style={{ maxWidth: 300, padding: 16 }}>
    <WishlistCard
      item={INITIAL_WISHLIST_ITEMS[1]}
      onMoveToBag={(i) => alert(`Moving ${i.name} to Bag`)}
      onRemove={() => alert('Removed from Wishlist')}
    />
  </View>
);

export const OutOfStock = (args: any) => (
  <View style={{ maxWidth: 300, padding: 16 }}>
    <WishlistCard
      item={INITIAL_WISHLIST_ITEMS[3]}
      onNotifyMe={(i) => alert(`Notify set for ${i.name}`)}
      onRemove={() => alert('Removed from Wishlist')}
    />
  </View>
);

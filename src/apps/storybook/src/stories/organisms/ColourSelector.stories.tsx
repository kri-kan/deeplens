import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, Text } from 'tamagui';
import { ColourSelector, ColourOption } from '../../components/organisms/ColourSelector/ColourSelector';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const ETHNIC_OPTIONS: ColourOption[] = [
  {
    key: 'navy_pink',
    label: 'Navy & Rani Pink',
    template: 'contrast-border',
    primaryColor: '#1565C0',
    secondaryColor: '#E91E63',
  },
  {
    key: 'purple_emerald',
    label: 'Violet & Emerald',
    template: 'dual-tone',
    primaryColor: '#6A1B9A',
    secondaryColor: '#2E7D32',
  },
  {
    key: 'mustard_green',
    label: 'Mustard & Green',
    template: 'half-and-half',
    primaryColor: '#FBC02D',
    secondaryColor: '#1B5E20',
  },
  {
    key: 'bandhani_multi',
    label: 'Bandhani Multi',
    template: 'multicolor',
    primaryColor: '#C62828',
    secondaryColor: '#FBC02D',
    tertiaryColor: '#2E7D32',
    quaternaryColor: '#1565C0',
  },
  {
    key: 'ivory_gold',
    label: 'Pure Ivory Gold',
    template: 'solid',
    primaryColor: '#D4AF37',
  },
];

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Organisms/ColourSelector',
  component: ColourSelector,
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const RichCardsFormat = (args: any) => {
  const [sel, setSel] = useState('navy_pink');
  return (
    <View style={{ maxWidth: 640, padding: 20 }}>
      <ColourSelector
        options={ETHNIC_OPTIONS}
        selected={sel}
        onSelect={setSel}
        format="cards"
      />
    </View>
  );
};

export const CompactDotsFormat = (args: any) => {
  const [sel, setSel] = useState('navy_pink');
  return (
    <View style={{ maxWidth: 640, padding: 20 }}>
      <ColourSelector
        options={ETHNIC_OPTIONS}
        selected={sel}
        onSelect={setSel}
        format="dots"
      />
    </View>
  );
};

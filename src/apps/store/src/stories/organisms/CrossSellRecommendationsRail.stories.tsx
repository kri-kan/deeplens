import React from 'react';
import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { CrossSellRecommendationsRail } from '../../components/organisms/CrossSellRecommendationsRail/CrossSellRecommendationsRail';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/CrossSellRecommendationsRail',
  component: CrossSellRecommendationsRail,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const Default = (args: any) => (
  <View style={{ maxWidth: 720, padding: 16 }}>
    <CrossSellRecommendationsRail
      onAddProduct={(p) => alert(`Added ${p.name} to Bag!`)}
    />
  </View>
);

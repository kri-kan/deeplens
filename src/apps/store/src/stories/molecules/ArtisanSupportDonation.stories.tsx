import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { ArtisanSupportDonation } from '../../components/molecules/ArtisanSupportDonation/ArtisanSupportDonation';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/ArtisanSupportDonation',
  component: ArtisanSupportDonation,
  args: {
    ...THEME_ARGS,
    selectedAmount: 20,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const Default = (args: any) => {
  const [donation, setDonation] = useState(20);

  return (
    <View style={{ maxWidth: 400, padding: 16 }}>
      <ArtisanSupportDonation
        selectedAmount={donation}
        onDonationChange={(amt) => setDonation(amt)}
      />
    </View>
  );
};

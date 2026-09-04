import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Button } from 'tamagui';
import { QuickPickerSheet } from '../../components/molecules/QuickPickerSheet';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof QuickPickerSheet> = {
  title: 'Molecules/QuickPickerSheet',
  component: QuickPickerSheet,
  decorators: [withFormFactor('mobile', 'Quick Picker Sheet (Sizes & Quantities)')],
};

export default meta;
type Story = StoryObj<typeof QuickPickerSheet>;

function SizePickerInteractive() {
  const [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState('Free Size');

  return (
    <YStack flex={1} padding={20} justifyContent="center" alignItems="center">
      <Button onPress={() => setVisible(true)}>Open Size Picker (Selected: {selected})</Button>
      <QuickPickerSheet
        visible={visible}
        type="size"
        selected={selected}
        onSelect={(val) => setSelected(val)}
        onClose={() => setVisible(false)}
      />
    </YStack>
  );
}

function KidsSizePickerInteractive() {
  const [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState('28 (8Y)');

  return (
    <YStack flex={1} padding={20} justifyContent="center" alignItems="center">
      <Button onPress={() => setVisible(true)}>Open Kids Size Picker (Selected: {selected})</Button>
      <QuickPickerSheet
        visible={visible}
        type="size"
        selected={selected}
        onSelect={(val) => setSelected(val)}
        onClose={() => setVisible(false)}
      />
    </YStack>
  );
}

export const SareesAndDresses: Story = {
  render: () => <SizePickerInteractive />,
};

export const KidsSizes0to15Y: Story = {
  render: () => <KidsSizePickerInteractive />,
};

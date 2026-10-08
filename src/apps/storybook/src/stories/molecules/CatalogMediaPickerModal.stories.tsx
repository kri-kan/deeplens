import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Button, Text } from 'tamagui';
import {
  CatalogMediaPickerModal,
  CatalogMediaSelection,
} from '../../components/molecules/CatalogMediaPickerModal';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof CatalogMediaPickerModal> = {
  title: 'Molecules/CatalogMediaPickerModal',
  component: CatalogMediaPickerModal,
  decorators: [withFormFactor('mobile', 'Catalog PDP Media Picker Modal')],
};

export default meta;
type Story = StoryObj<typeof CatalogMediaPickerModal>;

function CatalogMediaPickerInteractive() {
  const [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState<CatalogMediaSelection | null>(null);

  return (
    <YStack flex={1} padding={20} justifyContent="center" alignItems="center" gap={12}>
      <Button onPress={() => setVisible(true)}>Open Catalog PDP Media Picker</Button>

      {selected ? (
        <YStack
          padding={12}
          backgroundColor="#f5f5f5"
          borderRadius={8}
          alignItems="center"
          gap={4}
        >
          <Text fontSize={12} fontWeight="700">
            Linked Product: {selected.product.productCode} - {selected.product.title}
          </Text>
          <Text fontSize={11} color="#666">
            Image URL: {selected.imageUrl}
          </Text>
        </YStack>
      ) : (
        <Text fontSize={12} color="#888">
          No image currently selected.
        </Text>
      )}

      <CatalogMediaPickerModal
        visible={visible}
        initialSku="PRD-10291"
        onSelect={(selection) => {
          setSelected(selection);
          alert(`Linked: ${selection.product.productCode} with PDP photo`);
        }}
        onClose={() => setVisible(false)}
      />
    </YStack>
  );
}

export const Default: Story = {
  render: () => <CatalogMediaPickerInteractive />,
};

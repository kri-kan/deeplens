import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Text, Button } from 'tamagui';
import { BottomSheet, BottomSheetProps } from '../../components/atoms/BottomSheet';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof BottomSheet> = {
  title: 'Atoms/BottomSheet',
  component: BottomSheet,
  decorators: [withFormFactor('mobile', 'Content-Agnostic Bottom Sheet Atom')],
};

export default meta;
type Story = StoryObj<typeof BottomSheet>;

function SheetInteractive({ title = 'Modal Sheet', withFooter = false }: { title?: string; withFooter?: boolean }) {
  const [visible, setVisible] = useState(true);

  return (
    <YStack flex={1} padding={20} justifyContent="center" alignItems="center">
      <Button onPress={() => setVisible(true)}>Open Bottom Sheet</Button>
      <BottomSheet
        visible={visible}
        onClose={() => setVisible(false)}
        title={title}
        footer={
          withFooter ? (
            <Button onPress={() => setVisible(false)}>
              Confirm & Close
            </Button>
          ) : undefined
        }
      >
        <YStack gap={10} paddingVertical={12}>
          <Text fontSize={14} fontWeight="700">
            Empty / Custom Sheet Content Slot
          </Text>
          <Text fontSize={12} color="$color10">
            This atom provides pure backdrop mechanics, drag handle, elevation, and screen-bottom anchoring. Any layout, form, or list can be slotted as children.
          </Text>
        </YStack>
      </BottomSheet>
    </YStack>
  );
}

export const BasicSheet: Story = {
  render: () => <SheetInteractive title="Select Option" withFooter={false} />,
};

export const SheetWithFooter: Story = {
  render: () => <SheetInteractive title="Confirm Changes" withFooter={true} />,
};

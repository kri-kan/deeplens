import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { CustomCheckbox } from '../../components/atoms/CustomCheckbox';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof CustomCheckbox> = {
  title: 'Atoms/CustomCheckbox',
  component: CustomCheckbox,
  decorators: [withFormFactor('mobile', 'Custom Checkbox (Transparent / Checked)')],
};

export default meta;
type Story = StoryObj<typeof CustomCheckbox>;

function InteractiveDemo({ initialChecked = false }: { initialChecked?: boolean }) {
  const [checked, setChecked] = useState(initialChecked);
  return (
    <YStack gap={16} padding={20} alignItems="flex-start">
      <XStack alignItems="center" gap={10}>
        <CustomCheckbox
          checked={checked}
          onToggle={() => setChecked((prev) => !prev)}
          size={20}
          accessibilityLabel="Interactive multi-select demo"
        />
        <Text fontSize={14} fontWeight="600">
          {checked ? 'Selected (Checkmark active)' : 'Unselected (Transparent background)'}
        </Text>
      </XStack>
    </YStack>
  );
}

export const Unchecked: Story = {
  render: () => <InteractiveDemo initialChecked={false} />,
};

export const Checked: Story = {
  render: () => <InteractiveDemo initialChecked={true} />,
};

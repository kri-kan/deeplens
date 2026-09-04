import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import { DropdownField, DropdownFieldProps } from '../../components/atoms/DropdownField';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof DropdownField> = {
  title: 'Atoms/DropdownField',
  component: DropdownField,
  decorators: [withFormFactor('mobile', 'Dropdown Field (Underline Style)')],
};

export default meta;
type Story = StoryObj<typeof DropdownField>;

export const SelectedSize: Story = {
  args: {
    label: 'Size',
    value: '28 (8Y)',
    placeholder: 'Select Size',
    onPress: () => alert('Open size picker'),
  },
  render: (args: any) => (
    <YStack padding={20} maxWidth={240}>
      <DropdownField {...(args as DropdownFieldProps)} />
    </YStack>
  ),
};

export const PlaceholderState: Story = {
  args: {
    label: 'Quantity',
    value: '',
    placeholder: 'Pick Qty',
    onPress: () => alert('Open qty picker'),
  },
  render: (args: any) => (
    <YStack padding={20} maxWidth={240}>
      <DropdownField {...(args as DropdownFieldProps)} />
    </YStack>
  ),
};

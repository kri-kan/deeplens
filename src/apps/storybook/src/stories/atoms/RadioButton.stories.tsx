import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { RadioButton } from '../../components/atoms/RadioButton';

const meta: Meta<typeof RadioButton> = {
  title: 'Atoms/RadioButton',
  component: RadioButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadioButton>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <YStack padding={20} gap={16} alignItems="center">
        <RadioButton
          checked={checked}
          onPress={() => setChecked(!checked)}
          label={checked ? 'Option Selected' : 'Option Deselected'}
        />
      </YStack>
    );
  },
};

export const RadioGroup: Story = {
  render: () => {
    const [selected, setSelected] = useState('express');
    const options = [
      { id: 'standard', label: 'Standard Shipping (3-5 days)', cost: '₹50' },
      { id: 'express', label: 'Express Courier (1-2 days)', cost: '₹120' },
      { id: 'priority', label: 'VIP Same-Day Dispatch', cost: '₹250' },
    ];

    return (
      <YStack padding={20} gap={12} width={340}>
        <Text fontSize={14} fontWeight="800" marginBottom={4}>
          Select Fulfillment Method
        </Text>
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <XStack
              key={opt.id}
              alignItems="center"
              justifyContent="space-between"
              padding={12}
              borderRadius={8}
              borderWidth={1}
              borderColor={isSelected ? '#0F766E' : '#E5E7EB'}
              backgroundColor={isSelected ? 'rgba(15, 118, 110, 0.05)' : 'transparent'}
              onPress={() => setSelected(opt.id)}
            >
              <RadioButton
                checked={isSelected}
                onPress={() => setSelected(opt.id)}
                label={opt.label}
              />
              <Text fontSize={12} fontWeight="700" color="#0F766E">
                {opt.cost}
              </Text>
            </XStack>
          );
        })}
      </YStack>
    );
  },
};

export const DisabledStates: Story = {
  render: () => (
    <YStack padding={20} gap={16}>
      <RadioButton
        checked={true}
        disabled={true}
        label="Checked & Disabled"
      />
      <RadioButton
        checked={false}
        disabled={true}
        label="Unchecked & Disabled"
      />
    </YStack>
  ),
};

export const CustomSizes: Story = {
  render: () => (
    <XStack padding={20} gap={20} alignItems="center">
      <RadioButton checked={true} size={16} label="16px Compact" />
      <RadioButton checked={true} size={20} label="20px Standard" />
      <RadioButton checked={true} size={24} label="24px Large" />
    </XStack>
  ),
};

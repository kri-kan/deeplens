import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { ToggleSwitch, ToggleSwitchProps } from '../../components/atoms/ToggleSwitch';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARGS, THEME_ARG_TYPES } from '../../utils/storyTheme';

const meta: Meta<typeof ToggleSwitch> = {
  title: 'Atoms/ToggleSwitch',
  component: ToggleSwitch,
  decorators: [withFormFactor('mobile', 'Vayyari Design System - Toggle Switch Atom')],
  args: {
    ...THEME_ARGS,
    checked: true,
    size: 'md',
    disabled: false,
    showStateText: true,
    label: 'Dark Mode',
    labelPosition: 'left',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    showStateText: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    label: { control: 'text' },
    labelPosition: {
      control: 'radio',
      options: ['left', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ToggleSwitch>;

function InteractiveDemo(props: Partial<ToggleSwitchProps>) {
  const [checked, setChecked] = useState(props.checked ?? false);

  return (
    <YStack gap={20} padding={24} alignItems="flex-start">
      <ToggleSwitch
        {...props}
        checked={checked}
        onCheckedChange={(val) => {
          setChecked(val);
          props.onCheckedChange?.(val);
        }}
      />
    </YStack>
  );
}

export const Interactive: Story = {
  render: (args) => <InteractiveDemo {...args} />,
};

export const Sizes: Story = {
  render: () => {
    return (
      <YStack gap={24} padding={24} alignItems="flex-start">
        <Text fontSize={14} fontWeight="700" color="$color" textTransform="uppercase" letterSpacing={0.8}>
          Size Variations
        </Text>

        <InteractiveDemo size="sm" label="Small (36x20)" showStateText />
        <InteractiveDemo size="md" label="Medium (46x24 - Default)" defaultChecked showStateText />
        <InteractiveDemo size="lg" label="Large (56x30)" defaultChecked showStateText />
      </YStack>
    );
  },
};

export const StateIndicators: Story = {
  render: () => {
    return (
      <YStack gap={20} padding={24} alignItems="flex-start">
        <Text fontSize={14} fontWeight="700" color="$color" textTransform="uppercase" letterSpacing={0.8}>
          State Text Affordances
        </Text>

        <InteractiveDemo label="Auto-Tracking" showStateText defaultChecked={false} />
        <InteractiveDemo label="VIP Mudras Vault" showStateText defaultChecked={true} />
        <InteractiveDemo
          label="Custom Labels"
          showStateText
          defaultChecked={true}
          stateLabels={{ on: 'ACTIVE', off: 'INACTIVE' }}
        />
      </YStack>
    );
  },
};

export const DisabledStates: Story = {
  render: () => {
    return (
      <YStack gap={20} padding={24} alignItems="flex-start">
        <Text fontSize={14} fontWeight="700" color="$color" textTransform="uppercase" letterSpacing={0.8}>
          Disabled States
        </Text>

        <ToggleSwitch checked={false} disabled label="Disabled (Unchecked)" showStateText />
        <ToggleSwitch checked={true} disabled label="Disabled (Checked)" showStateText />
      </YStack>
    );
  },
};

export const LabelPositions: Story = {
  render: () => {
    return (
      <YStack gap={20} padding={24} alignItems="flex-start">
        <Text fontSize={14} fontWeight="700" color="$color" textTransform="uppercase" letterSpacing={0.8}>
          Label Alignments
        </Text>

        <InteractiveDemo label="Left-Aligned Label" labelPosition="left" defaultChecked />
        <InteractiveDemo label="Right-Aligned Label" labelPosition="right" defaultChecked />
      </YStack>
    );
  },
};

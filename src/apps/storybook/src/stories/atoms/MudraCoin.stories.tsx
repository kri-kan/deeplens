import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSparkles } from 'react-icons/lu';
import { MudraCoin } from '../../components/atoms/MudraCoin';
import { SurveyMudrasBadge } from '../../components/atoms/SurveyMudrasBadge';
import { getSurveyTheme } from '../../components/organisms/TypeformSurvey/themeConfig';

const meta: Meta<typeof MudraCoin> = {
  title: 'Atoms/Mudra Coin',
  component: MudraCoin,
  args: {
    size: 24,
    isPulsing: false,
    isSpinning: false,
  },
  argTypes: {
    size: {
      control: { type: 'range', min: 12, max: 128, step: 2 },
    },
    isPulsing: {
      control: 'boolean',
    },
    isSpinning: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MudraCoin>;

export const Default: Story = {
  args: {
    size: 32,
    isPulsing: false,
    isSpinning: false,
  },
  render: (args) => (
    <YStack
      alignItems="center"
      justifyContent="center"
      padding={32}
      borderRadius={16}
      backgroundColor="#0f141c"
      borderColor="#263143"
      borderWidth={1}
      gap={16}
    >
      <MudraCoin {...args} />
      <Text color="#d4af37" fontSize={13} fontWeight="700">
        Mudra Coin ({args.size}px)
      </Text>
    </YStack>
  ),
};

export const SizeSpectrum: StoryObj = {
  render: () => {
    const sizes = [
      { size: 12, label: 'Micro / Tag' },
      { size: 14, label: 'Inline Pill' },
      { size: 16, label: 'Badge / Header' },
      { size: 20, label: 'Default / Button' },
      { size: 28, label: 'Card Accent' },
      { size: 40, label: 'Modal / Reward' },
      { size: 64, label: 'Hero Display' },
      { size: 96, label: 'High-Res Asset' },
    ];

    return (
      <YStack
        gap={24}
        padding={24}
        backgroundColor="#0c0e14"
        borderRadius={16}
        maxWidth={720}
        width="100%"
      >
        <YStack gap={4}>
          <Text color="#ffffff" fontSize={18} fontWeight="800">
            Mudra Coin — Resolution Spectrum
          </Text>
          <Text color="#8b949e" fontSize={12}>
            Vector-rendered gold coin icon preserving geometric knot detail and concentric sheen across all form factors.
          </Text>
        </YStack>

        <XStack flexWrap="wrap" gap={18} alignItems="flex-end">
          {sizes.map(({ size, label }) => (
            <YStack
              key={size}
              alignItems="center"
              gap={8}
              padding={12}
              borderRadius={10}
              backgroundColor="#161b24"
              borderColor="#242c3d"
              borderWidth={1}
              minWidth={size < 24 ? 80 : size + 28}
            >
              <MudraCoin size={size} />
              <YStack alignItems="center">
                <Text color="#d4af37" fontSize={11} fontWeight="800">
                  {size}px
                </Text>
                <Text color="#8b949e" fontSize={9.5}>
                  {label}
                </Text>
              </YStack>
            </YStack>
          ))}
        </XStack>
      </YStack>
    );
  },
};

export const CompactBadges: StoryObj = {
  render: () => {
    const ivoryTheme = getSurveyTheme('ivory-editorial');
    const darkTheme = getSurveyTheme('vayyari-dark');

    return (
      <YStack
        gap={20}
        padding={24}
        backgroundColor="#0e1117"
        borderRadius={16}
        maxWidth={680}
        width="100%"
      >
        <YStack gap={4}>
          <Text color="#ffffff" fontSize={16} fontWeight="800">
            Compact Mudra Badges (Count Only, No &quot;Mudras&quot; Label)
          </Text>
          <Text color="#8b949e" fontSize={12}>
            High-density currency indicators displaying coin icon and quantity count with optical baseline alignment.
          </Text>
        </YStack>

        {/* Small Scale */}
        <YStack gap={8}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            Small Density (size=&quot;sm&quot;)
          </Text>
          <XStack gap={10} flexWrap="wrap" alignItems="center">
            <SurveyMudrasBadge amount={700} theme={ivoryTheme} variant="compact" size="sm" />
            <SurveyMudrasBadge amount={1425} theme={darkTheme} variant="compact" size="sm" isPulsing={true} />
            <SurveyMudrasBadge amount={175} theme={ivoryTheme} variant="compact" size="sm" prefix="+" />
            <SurveyMudrasBadge amount={350} theme={darkTheme} variant="compact" size="sm" prefix="+" />
          </XStack>
        </YStack>

        {/* Medium / Default Scale */}
        <YStack gap={8}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            Medium Density (Default)
          </Text>
          <XStack gap={10} flexWrap="wrap" alignItems="center">
            <SurveyMudrasBadge amount={700} theme={ivoryTheme} variant="compact" />
            <SurveyMudrasBadge amount={1425} theme={darkTheme} variant="compact" isPulsing={true} />
            <SurveyMudrasBadge amount={5000} theme={ivoryTheme} variant="compact" prefix="+" />
            <SurveyMudrasBadge amount={25000} theme={darkTheme} variant="compact" prefix="+" />
          </XStack>
        </YStack>

        {/* Large Scale */}
        <YStack gap={8}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            Large Prominence (size=&quot;lg&quot;)
          </Text>
          <XStack gap={10} flexWrap="wrap" alignItems="center">
            <SurveyMudrasBadge amount={700} theme={ivoryTheme} variant="compact" size="lg" />
            <SurveyMudrasBadge amount={1425} theme={darkTheme} variant="compact" size="lg" isPulsing={true} />
            <SurveyMudrasBadge amount={5000} theme={ivoryTheme} variant="compact" size="lg" prefix="+" />
          </XStack>
        </YStack>
      </YStack>
    );
  },
};

export const BadgesAndPills: StoryObj = {
  render: () => {
    const ivoryTheme = getSurveyTheme('ivory-editorial');
    const darkTheme = getSurveyTheme('vayyari-dark');

    return (
      <YStack
        gap={20}
        padding={24}
        backgroundColor="#0e1117"
        borderRadius={16}
        maxWidth={680}
        width="100%"
      >
        <Text color="#ffffff" fontSize={16} fontWeight="800">
          Component Context Integrations
        </Text>

        {/* 1. Header Vault Badges */}
        <YStack gap={10}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            1. SurveyMudrasBadge (Vault Header Style)
          </Text>
          <XStack gap={12} flexWrap="wrap" alignItems="center">
            <SurveyMudrasBadge amount={700} theme={ivoryTheme} variant="vault" />
            <SurveyMudrasBadge amount={1425} theme={darkTheme} variant="vault" isPulsing={true} />
            <SurveyMudrasBadge amount={5000} theme={ivoryTheme} variant="vault" prefix="+" />
          </XStack>
        </YStack>

        {/* 2. Chip Badges */}
        <YStack gap={10}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            2. SurveyMudrasBadge (Compact Chip Style)
          </Text>
          <XStack gap={12} flexWrap="wrap" alignItems="center">
            <SurveyMudrasBadge amount={175} theme={ivoryTheme} variant="chip" prefix="+" />
            <SurveyMudrasBadge amount={350} theme={darkTheme} variant="chip" prefix="+" />
            <SurveyMudrasBadge amount={700} theme={ivoryTheme} variant="chip" prefix="+" />
          </XStack>
        </YStack>

        {/* 3. Compact Count-Only Badges (No "Mudras" label) */}
        <YStack gap={10}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            3. Compact Badges (Count Only, No &quot;Mudras&quot; Label)
          </Text>
          <XStack gap={12} flexWrap="wrap" alignItems="center">
            <SurveyMudrasBadge amount={700} theme={ivoryTheme} variant="compact" />
            <SurveyMudrasBadge amount={1425} theme={darkTheme} variant="compact" isPulsing={true} />
            <SurveyMudrasBadge amount={175} theme={ivoryTheme} variant="compact" prefix="+" />
            <SurveyMudrasBadge amount={350} theme={darkTheme} variant="compact" prefix="+" />
            <SurveyMudrasBadge amount={5000} theme={ivoryTheme} variant="compact" prefix="+" />
          </XStack>
        </YStack>

        {/* 4. Inline Currency Pills */}
        <YStack gap={10}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            4. Admin Ledger &amp; Questions Currency Pills (Horizontally Aligned)
          </Text>
          <XStack gap={12} flexWrap="wrap" alignItems="center">
            <XStack
              alignItems="center"
              justifyContent="center"
              gap={6}
              backgroundColor="rgba(212, 175, 55, 0.12)"
              borderColor="#d4af37"
              borderWidth={1}
              borderRadius={20}
              paddingHorizontal={10}
              paddingVertical={4}
            >
              <MudraCoin size={14} />
              <Text color="#d4af37" fontSize={12} lineHeight={14} fontWeight="800" userSelect="none">
                +175 Mudras per Question
              </Text>
            </XStack>

            <XStack
              alignItems="center"
              justifyContent="center"
              gap={6}
              backgroundColor="#161b22"
              borderColor="#30363d"
              borderWidth={1}
              borderRadius={8}
              paddingHorizontal={12}
              paddingVertical={6}
            >
              <MudraCoin size={16} />
              <Text color="#e6edf3" fontSize={13} lineHeight={16} fontWeight="700" userSelect="none">
                Wallet Balance:{' '}
                <Text color="#10b981" fontSize={13} lineHeight={16} fontWeight="800">
                  2,450 Mudras
                </Text>
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    );
  },
};

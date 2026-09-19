import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { FormFactorShell } from '../../components/templates/FormFactorShell/FormFactorShell';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { useResponsive } from '../../theme';

function SampleOrganismContent() {
  const responsive = useResponsive();

  return (
    <YStack padding={20} gap={16} width="100%">
      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
        <YStack>
          <Text fontSize={18} fontWeight="900">
            Responsive Organism Showcase
          </Text>
          <Text fontSize={12} color="#64748B">
            Automatically detects and responds to the FormFactorShell environment.
          </Text>
        </YStack>

        <XStack
          backgroundColor="#0F766E"
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={8}
        >
          <Text fontSize={11} fontWeight="800" color="#FFFFFF">
            Active: {responsive.factor.toUpperCase()}
          </Text>
        </XStack>
      </XStack>

      <XStack
        flexDirection={responsive.isMobile ? 'column' : 'row'}
        gap={12}
        width="100%"
      >
        <YStack
          flex={1}
          padding={16}
          borderRadius={12}
          backgroundColor="rgba(56, 189, 248, 0.08)"
          borderWidth={1}
          borderColor="rgba(56, 189, 248, 0.3)"
          gap={6}
        >
          <Text fontSize={14} fontWeight="800" color="#0369A1">
            📱 Responsive Detection
          </Text>
          <Text fontSize={12} color="#334155">
            isMobile: {String(responsive.isMobile)} | isTablet: {String(responsive.isTablet)} | isDesktop: {String(responsive.isDesktop)}
          </Text>
        </YStack>

        <YStack
          flex={1}
          padding={16}
          borderRadius={12}
          backgroundColor="rgba(16, 185, 129, 0.08)"
          borderWidth={1}
          borderColor="rgba(16, 185, 129, 0.3)"
          gap={6}
        >
          <Text fontSize={14} fontWeight="800" color="#047857">
            📐 Viewport Width
          </Text>
          <Text fontSize={12} color="#334155">
            Container Width: {String(responsive.containerWidth)}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

const meta: Meta<any> = {
  title: 'Templates/FormFactorShell',
  component: FormFactorShell,
  parameters: {
    // Avoid double wrapping itself
    formFactorShell: false,
  },
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof FormFactorShell>;

export const InteractiveShell: Story = {
  render: () => (
    <FormFactorShell
      title="Sample Responsive Organism"
      category="Organisms"
      initialFactor="mobile"
    >
      <SampleOrganismContent />
    </FormFactorShell>
  ),
};

export const DesktopShell: Story = {
  render: () => (
    <FormFactorShell
      title="Desktop Storefront Window"
      category="Templates"
      initialFactor="desktop"
    >
      <SampleOrganismContent />
    </FormFactorShell>
  ),
};

export const TabletShell: Story = {
  render: () => (
    <FormFactorShell
      title="iPad Display Frame"
      category="Organisms"
      initialFactor="tablet"
    >
      <SampleOrganismContent />
    </FormFactorShell>
  ),
};

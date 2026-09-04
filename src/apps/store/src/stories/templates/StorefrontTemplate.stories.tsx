import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Text } from 'tamagui';
import { StorefrontTemplate } from '../../components/templates/StorefrontTemplate';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { useTheme } from '../../theme';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
function SlotBox({ label, height = 120 }: { label: string; height?: number }) {
  const { tokens } = useTheme();
  return (
    <YStack
      height={height}
      width="100%"
      backgroundColor={tokens.surfaceRaised}
      borderWidth={2}
      borderStyle="dashed"
      borderColor={tokens.border}
      borderRadius={16}
      alignItems="center"
      justifyContent="center"
      padding={16}
    >
      <Text fontSize={14} fontWeight="800" color={tokens.accent} letterSpacing={0.5}>
        [SLOT] {label}
      </Text>
      <Text fontSize={12} color={tokens.textMuted} marginTop={4}>
        Pluggable template region
      </Text>
    </YStack>
  );
}

const renderWireframe = () => (
  <StorefrontTemplate
    header={<SlotBox label="Header Slot (Logo, Search, Nav, Cart)" height={68} />}
    hero={<SlotBox label="Hero Banner / Slider Slot" height={340} />}
    categories={<SlotBox label="Category Navigation Strip Slot" height={60} />}
    featured={<SlotBox label="Featured Highlights / Bento Grid Slot" height={260} />}
    collections={<SlotBox label="Curated Collections / Recommendation Strip Slot" height={280} />}
    trustBadges={<SlotBox label="Trust Badges & Guarantees Slot" height={70} />}
    footer={<SlotBox label="Global Brand Footer Slot" height={200} />}
  />
);

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Templates/StorefrontTemplate',
  component: StorefrontTemplate,
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof StorefrontTemplate>;

export const InteractiveFormFactors: Story = {
  render: () => (
    <FormFactorPreview title="StorefrontTemplate" initialFactor="desktop">
      {renderWireframe()}
    </FormFactorPreview>
  ),
};

export const DesktopView: Story = {
  render: renderWireframe,
  decorators: [withFormFactor('desktop', 'Desktop View (1200px)')],
};

export const TabletView: Story = {
  render: renderWireframe,
  decorators: [withFormFactor('tablet', 'Tablet View (768px)')],
};

export const MobileView: Story = {
  render: renderWireframe,
  decorators: [withFormFactor('mobile', 'Mobile View (390px)')],
};

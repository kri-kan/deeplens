import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Text } from 'tamagui';
import { ProductDetailTemplate } from '../../components/templates/ProductDetailTemplate';
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
  <ProductDetailTemplate
    header={<SlotBox label="Header Slot" height={68} />}
    breadcrumbs={<SlotBox label="Breadcrumb Slot" height={32} />}
    gallery={<SlotBox label="Media Gallery Slot (Desktop Left / Mobile Top)" height={480} />}
    purchasePanel={<SlotBox label="Purchase Panel Slot (Pricing, Selectors, Add to Bag)" height={480} />}
    crossSells={<SlotBox label="Frequently Bought Together / Cross-Sell Bundle Slot" height={220} />}
    specifications={<SlotBox label="Specifications & Craft Details Slot" height={180} />}
    reviews={<SlotBox label="Customer Reviews & Ratings Slot" height={260} />}
    recommendations={<SlotBox label="Similar Products Carousel Strip Slot" height={280} />}
    stickyBuyBar={<SlotBox label="Mobile Sticky Add to Bag Slot" height={70} />}
  />
);

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Templates/ProductDetailTemplate',
  component: ProductDetailTemplate,
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof ProductDetailTemplate>;

export const InteractiveFormFactors: Story = {
  render: () => (
    <FormFactorPreview title="ProductDetailTemplate" initialFactor="desktop">
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

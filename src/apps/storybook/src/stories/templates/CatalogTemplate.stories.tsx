import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Text } from 'tamagui';
import { CatalogTemplate } from '../../components/templates/CatalogTemplate';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { useTheme } from '../../theme';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
function SlotBox({ label, height = 100 }: { label: string; height?: number }) {
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
  <CatalogTemplate
    header={<SlotBox label="Header Slot" height={68} />}
    breadcrumbs={<SlotBox label="Breadcrumb Navigation Slot" height={32} />}
    filterSidebar={<SlotBox label="Persistent Left Filter Sidebar (260px)" height={540} />}
    isFilterSidebarExpanded={true}
    summaryBar={<SlotBox label="Filter Hamburger & Sort Controls Slot" height={44} />}
    productGrid={<SlotBox label="Responsive Product Grid Slot" height={480} />}
    pagination={<SlotBox label="Pagination / Infinite Load Trigger Slot" height={60} />}
    stickyBottomBar={<SlotBox label="Mobile & Tablet Sticky Bottom Bar [⇅ SORT | ⊶ FILTER]" height={52} />}
  />
);

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Templates/CatalogTemplate',
  component: CatalogTemplate,
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof CatalogTemplate>;

export const InteractiveFormFactors: Story = {
  render: () => (
    <FormFactorPreview title="CatalogTemplate" initialFactor="desktop">
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

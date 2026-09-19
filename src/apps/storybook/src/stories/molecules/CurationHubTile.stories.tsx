import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import {
  LuLayers,
  LuFileText,
  LuImage,
  LuSparkles,
  LuShoppingBag,
  LuPercent,
} from 'react-icons/lu';
import {
  CurationHubTile,
  CurationHubTileProps,
  HubMetricDivider,
  HubMetricItem,
} from '../../components/molecules/CurationHubTile';
import { CustomSwatchDot } from '../../components/atoms/SwatchDot/CustomSwatchDot';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof CurationHubTile> = {
  title: 'Molecules/CurationHubTile',
  component: CurationHubTile,
  decorators: [withFormFactor('mobile', 'Curation Hub Tile - Standardized Low-Level Element')],
  argTypes: {
    title: { control: 'text', description: 'Main tile title' },
    minHeight: { control: 'number', description: 'Minimum height of tile' },
    isSelected: { control: 'boolean', description: 'Selected active state' },
    showChevron: { control: 'boolean', description: 'Show right chevron' },
  },
  args: {
    title: 'Qualify & Group',
    minHeight: 84,
    isSelected: false,
    showChevron: true,
  },
};

export default meta;
type Story = StoryObj<typeof CurationHubTile>;

/**
 * 1. Default Side-by-Side Pair:
 * Demonstrates the standard 2-column curation hub pairing (Qualify & Group + Metadata).
 * Shows that despite differing title lengths ("Qualify & Group" wrapping vs single-word "Metadata"),
 * both tiles have IDENTICAL bottom spacing for the inline pipe-separated metrics!
 */
export const DefaultHubPair: Story = {
  name: '1. Standard 2-Column Hub Pair (Balanced Spacing)',
  render: () => (
    <YStack width={360} gap={12} padding={12}>
      <Text fontSize={12} fontWeight="700" color="#64748B" textTransform="uppercase">
        Curation Stages (2-Column Grid)
      </Text>
      <XStack gap={10} alignItems="stretch" width="100%">
        {/* Tile 1: Qualify & Group */}
        <CurationHubTile
          title="Qualify & Group"
          icon={<LuLayers size={16} color="#0D9488" />}
          iconBg="rgba(13, 148, 136, 0.1)"
          metrics={[
            {
              icon: <LuImage size={11} color="#0D9488" />,
              label: '6',
              fontWeight: '800',
            },
            {
              icon: (
                <CustomSwatchDot
                  template="contrast-border"
                  primaryColor="#E91E63"
                  secondaryColor="#7A2E8C"
                  size={11}
                />
              ),
              label: '6',
              fontWeight: '800',
            },
          ]}
          onPress={() => alert('Qualify & Group clicked')}
        />

        {/* Tile 2: Metadata */}
        <CurationHubTile
          title="Metadata"
          icon={<LuFileText size={16} color="#16A34A" />}
          iconBg="#F0FDF4"
          metrics={[
            {
              label: '₹2,499',
              fontWeight: '800',
              color: '#1E293B',
            },
            {
              label: '35% OFF',
              fontWeight: '800',
              color: '#16A34A',
            },
          ]}
          onPress={() => alert('Metadata clicked')}
        />
      </XStack>
    </YStack>
  ),
};

/**
 * 2. Title Variations: Single-Line vs Multi-Line Wrapped
 * Demonstrates how titles adapt dynamically and wrap without breaking bottom alignment.
 */
export const TitleLengthComparison: Story = {
  name: '2. Title Lengths (Single-Line vs Wrapped)',
  render: () => (
    <YStack width={360} gap={12} padding={12}>
      <Text fontSize={12} fontWeight="700" color="#64748B">
        Comparing Short vs Long Wrapping Titles
      </Text>
      <XStack gap={10} alignItems="stretch" width="100%">
        <CurationHubTile
          title="Inventory"
          icon={<LuShoppingBag size={16} color="#2563EB" />}
          iconBg="rgba(37, 99, 235, 0.1)"
          metrics={[
            { label: '42 Units', fontWeight: '800' },
            { label: 'In Stock', color: '#16A34A', fontWeight: '800' },
          ]}
        />

        <CurationHubTile
          title="Fabric & Weave Specifications"
          icon={<LuSparkles size={16} color="#7C3AED" />}
          iconBg="rgba(124, 58, 237, 0.1)"
          metrics={[
            { label: 'Banarasi Silk', fontWeight: '800' },
            { label: 'Zari Border', color: '#D97706', fontWeight: '800' },
          ]}
        />
      </XStack>
    </YStack>
  ),
};

/**
 * 3. Varied Data Sizes:
 * Shows how inline pipe-separated metrics handle zero counts, huge values, and edge cases.
 */
export const VariedDataSizes: Story = {
  name: '3. Data Sizes & Numerical Edge Cases',
  render: () => (
    <YStack width={360} gap={14} padding={12}>
      <Text fontSize={12} fontWeight="700" color="#64748B">
        Zero States, Large Numbers & Premium Pricing
      </Text>

      {/* Row A: Empty / Zero Counts */}
      <XStack gap={10} alignItems="stretch" width="100%">
        <CurationHubTile
          title="Empty State"
          icon={<LuLayers size={16} color="#64748B" />}
          iconBg="#F1F5F9"
          metrics={[
            { icon: <LuImage size={11} color="#64748B" />, label: '0' },
            { label: 'No Swatches', color: '#94A3B8' },
          ]}
        />

        <CurationHubTile
          title="Unpriced"
          icon={<LuFileText size={16} color="#64748B" />}
          iconBg="#F1F5F9"
          metrics={[
            { label: '₹0' },
            { label: '0% OFF', color: '#94A3B8' },
          ]}
        />
      </XStack>

      {/* Row B: High Volume Counts & High Price */}
      <XStack gap={10} alignItems="stretch" width="100%">
        <CurationHubTile
          title="High Media Volume"
          icon={<LuLayers size={16} color="#0D9488" />}
          iconBg="rgba(13, 148, 136, 0.1)"
          metrics={[
            { icon: <LuImage size={11} color="#0D9488" />, label: '148 Photos' },
            { label: '32 Colors' },
          ]}
        />

        <CurationHubTile
          title="Luxury Pricing"
          icon={<LuPercent size={16} color="#EA580C" />}
          iconBg="rgba(234, 88, 12, 0.1)"
          metrics={[
            { label: '₹1,49,999' },
            { label: '65% OFF', color: '#DC2626' },
          ]}
        />
      </XStack>
    </YStack>
  ),
};

/**
 * 4. Dense 3-Item Metrics:
 * Testing three inline pipe-separated items on a single card.
 */
export const DenseThreeItemMetrics: Story = {
  name: '4. Dense 3-Item Pipe Separators',
  render: () => (
    <YStack width={360} gap={12} padding={12}>
      <Text fontSize={12} fontWeight="700" color="#64748B">
        Dense 3-Metric Pipe Separation
      </Text>
      <CurationHubTile
        title="Comprehensive Curation"
        icon={<LuLayers size={16} color="#0D9488" />}
        iconBg="rgba(13, 148, 136, 0.1)"
        metrics={[
          { icon: <LuImage size={11} color="#0D9488" />, label: '12 Media' },
          { label: '4 Swatches' },
          { label: '8 Mapped', color: '#16A34A' },
        ]}
      />
    </YStack>
  ),
};

/**
 * 5. Low-Level Elements Playground:
 * Demonstrates using the low-level atoms `HubMetricItem` and `HubMetricDivider` individually.
 */
export const LowLevelElementsPlayground: Story = {
  name: '5. Low-Level Elements (HubMetricItem & Divider)',
  render: () => (
    <YStack width={360} gap={16} padding={16} backgroundColor="#FFFFFF" borderRadius={12} borderWidth={1} borderColor="#E2E8F0">
      <Text fontSize={13} fontWeight="800" color="#0F172A">
        Low-Level Building Blocks
      </Text>

      <YStack gap={8}>
        <Text fontSize={11} fontWeight="700" color="#64748B">
          Custom Composition 1:
        </Text>
        <XStack alignItems="center" gap={6}>
          <HubMetricItem icon={<LuImage size={12} color="#0D9488" />} label="16 Media" />
          <HubMetricDivider />
          <HubMetricItem label="4 Colors" color="#7C3AED" />
          <HubMetricDivider />
          <HubMetricItem label="₹3,999" color="#0F172A" />
        </XStack>
      </YStack>

      <YStack gap={8}>
        <Text fontSize={11} fontWeight="700" color="#64748B">
          Custom Composition 2 (Storefront Price Strip):
        </Text>
        <XStack alignItems="center" gap={6}>
          <HubMetricItem label="₹1,299" fontSize={14} fontWeight="900" />
          <HubMetricDivider color="#E2E8F0" />
          <HubMetricItem label="MRP ₹1,999" color="#94A3B8" fontSize={12} />
          <HubMetricDivider color="#E2E8F0" />
          <HubMetricItem label="35% OFF" color="#16A34A" fontSize={12} fontWeight="900" />
        </XStack>
      </YStack>
    </YStack>
  ),
};

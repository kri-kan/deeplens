import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../theme';
import { StatusBadge } from '../../components/atoms/StatusBadge';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta = {
  title: 'Theme/BusinessNeutralTokens',
  decorators: [withFormFactor('mobile', 'W3C/Polaris Design Token Specification')],
};

export default meta;
type Story = StoryObj;

export const IntentColorSystem: Story = {
  render: () => {
    const { tokens } = useTheme();

    const intents = [
      {
        id: 'attention',
        title: 'Attention (Amber / Risk / Caution)',
        desc: 'Pending action, balance due, COD, verification needed',
        badge: 'COD Pending · ₹50',
      },
      {
        id: 'positive',
        title: 'Positive (Emerald / Success / Credit)',
        desc: 'Payment captured, prepaid verified, receipt attached',
        badge: 'Prepaid · Paid in Full',
      },
      {
        id: 'critical',
        title: 'Critical (Crimson / Destructive / Error)',
        desc: 'Batch delete, failed payment, cancellation',
        badge: 'Order Cancelled',
      },
      {
        id: 'info',
        title: 'Info (Accent / Informative / Highlight)',
        desc: 'SKU link, category active tab, in transit',
        badge: 'In Transit · BLR Hub',
      },
    ] as const;

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <YStack gap={20}>
          <YStack gap={4}>
            <Text fontSize={18} fontWeight="800" color={tokens.text}>
              Semantic Status Intents
            </Text>
            <Text fontSize={12} color={tokens.textMuted}>
              Invariant 4-role contract (base, subtle, border, text) ensuring WCAG AA contrast.
            </Text>
          </YStack>

          {intents.map((item) => {
            const colors = tokens.status[item.id];
            return (
              <YStack
                key={item.id}
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                padding={12}
                gap={10}
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1}>
                    <Text fontSize={13} fontWeight="800" color={tokens.text}>
                      {item.title}
                    </Text>
                    <Text fontSize={11} color={tokens.textMuted}>
                      {item.desc}
                    </Text>
                  </YStack>
                  <StatusBadge intent={item.id} label={item.badge} size="sm" />
                </XStack>

                {/* Swatches: base, subtle, border, text */}
                <XStack gap={8} alignItems="center">
                  <YStack flex={1} gap={3} alignItems="center">
                    <YStack width="100%" height={26} borderRadius={4} backgroundColor={colors.base} />
                    <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>BASE</Text>
                  </YStack>
                  <YStack flex={1} gap={3} alignItems="center">
                    <YStack width="100%" height={26} borderRadius={4} backgroundColor={colors.subtle} borderWidth={1} borderColor={colors.border} />
                    <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>SUBTLE</Text>
                  </YStack>
                  <YStack flex={1} gap={3} alignItems="center">
                    <YStack width="100%" height={26} borderRadius={4} backgroundColor={colors.border} />
                    <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>BORDER</Text>
                  </YStack>
                  <YStack flex={1} gap={3} alignItems="center">
                    <YStack width="100%" height={26} borderRadius={4} backgroundColor={colors.text} />
                    <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>TEXT</Text>
                  </YStack>
                </XStack>
              </YStack>
            );
          })}
        </YStack>
      </ScrollView>
    );
  },
};

export const SpatialSurfaces: Story = {
  render: () => {
    const { tokens } = useTheme();

    const surfaces = [
      { name: 'Canvas', val: tokens.surfaces.canvas, desc: 'Root application viewport' },
      { name: 'Base', val: tokens.surfaces.base, desc: 'Primary card and content container' },
      { name: 'Raised', val: tokens.surfaces.raised, desc: 'Elevated popovers, menus, sheets' },
      { name: 'Sunken', val: tokens.surfaces.sunken, desc: 'Input wells, thumbnail placeholders' },
    ];

    return (
      <YStack padding={16} gap={16}>
        <YStack gap={4}>
          <Text fontSize={18} fontWeight="800" color={tokens.text}>
            Spatial Surfaces
          </Text>
          <Text fontSize={12} color={tokens.textMuted}>
            Neutral elevation roles independent of product vertical or fabric colors.
          </Text>
        </YStack>

        <YStack gap={10}>
          {surfaces.map((s) => (
            <XStack
              key={s.name}
              backgroundColor={s.val}
              borderWidth={1}
              borderColor={tokens.border}
              borderRadius={tokens.radius.md}
              padding={14}
              alignItems="center"
              justifyContent="space-between"
            >
              <YStack>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  surface.{s.name.toLowerCase()}
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  {s.desc}
                </Text>
              </YStack>
              <YStack
                paddingHorizontal={8}
                paddingVertical={4}
                borderRadius={4}
                backgroundColor={tokens.surfaceRaised}
                borderWidth={1}
                borderColor={tokens.border}
              >
                <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
                  {s.val}
                </Text>
              </YStack>
            </XStack>
          ))}
        </YStack>
      </YStack>
    );
  },
};

export const ControlSizingScale: Story = {
  render: () => {
    const { tokens } = useTheme();

    const scale = [
      { key: 'xs', size: tokens.sizes.control.xs, label: 'Control XS (24px)', usage: 'Inline table/list controls, compact pill buttons' },
      { key: 'sm', size: tokens.sizes.control.sm, label: 'Control SM (32px)', usage: 'Dense admin inputs, stacked pricing, small icons' },
      { key: 'md', size: tokens.sizes.control.md, label: 'Control MD (40px)', usage: 'Standard mobile forms, search fields' },
      { key: 'lg', size: tokens.sizes.control.lg, label: 'Control LG (48px)', usage: 'Primary checkout CTAs, thumb-zone buttons' },
    ];

    return (
      <YStack padding={16} gap={16}>
        <YStack gap={4}>
          <Text fontSize={18} fontWeight="800" color={tokens.text}>
            Control Sizing Hierarchy
          </Text>
          <Text fontSize={12} color={tokens.textMuted}>
            Modular height and density tokens replacing ad-hoc pixel values.
          </Text>
        </YStack>

        <YStack gap={12}>
          {scale.map((lvl) => (
            <YStack key={lvl.key} gap={4}>
              <XStack justifyContent="space-between">
                <Text fontSize={12} fontWeight="700" color={tokens.text}>
                  sizes.control.{lvl.key} ({lvl.size}px)
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  {lvl.usage}
                </Text>
              </XStack>
              <XStack
                height={lvl.size}
                backgroundColor={tokens.accent}
                borderRadius={tokens.radius.sm}
                alignItems="center"
                paddingHorizontal={12}
                justifyContent="center"
              >
                <Text fontSize={12} fontWeight="700" color={tokens.accentForeground}>
                  Sample Control ({lvl.size}px)
                </Text>
              </XStack>
            </YStack>
          ))}
        </YStack>
      </YStack>
    );
  },
};

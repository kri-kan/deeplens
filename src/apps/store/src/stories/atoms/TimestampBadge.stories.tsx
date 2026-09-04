import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { TimestampBadge, TimestampBadgeProps } from '../../components/atoms/TimestampBadge';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof TimestampBadge> = {
  title: 'Atoms/TimestampBadge',
  component: TimestampBadge,
  decorators: [withFormFactor('mobile', 'Adaptive Timestamp Badge (Clean + Floating Tooltip)')],
  argTypes: {
    compact: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md'] },
  },
};

export default meta;
type Story = StoryObj<typeof TimestampBadge>;

// Mock timestamps across all temporal brackets
const now = new Date();
const TEN_MINS_AGO = new Date(now.getTime() - 10 * 60 * 1000);
const FOUR_HOURS_AGO = new Date(now.getTime() - 4 * 60 * 60 * 1000);
const YESTERDAY = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const THIS_YEAR = new Date(now.getFullYear(), 7, 14, 11, 20); // 14 Aug this year
const PAST_YEAR = new Date(2024, 10, 14, 15, 45); // 14 Nov 2024

export const StandardVsCompact: Story = {
  render: () => {
    const samples = [
      { label: 'Today (Recent/Same-Day)', date: FOUR_HOURS_AGO, desc: 'Compact shows just the time; hovering/tapping shows full datetime' },
      { label: 'Yesterday', date: YESTERDAY, desc: 'Compact shows short "Y\'day" anchor' },
      { label: 'Earlier This Year', date: THIS_YEAR, desc: 'Compact shows day and month' },
      { label: 'Historical Past Year', date: PAST_YEAR, desc: 'Compact shows month and 2-digit year' },
    ];

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <YStack gap={16}>
          <YStack gap={4}>
            <Text fontSize={16} fontWeight="800">
              Clean Typography + Floating Tooltip
            </Text>
            <Text fontSize={12} color="$color10">
              No icon or dot clutter. Tap or hover over any badge to view the full precision timestamp in a floating tooltip without layout shift!
            </Text>
          </YStack>

          {samples.map((item, idx) => (
            <YStack
              key={idx}
              padding={12}
              borderRadius={8}
              backgroundColor="$color2"
              borderWidth={1}
              borderColor="$color5"
              gap={8}
            >
              <YStack>
                <Text fontSize={13} fontWeight="700">
                  {item.label}
                </Text>
                <Text fontSize={11} color="$color10">
                  {item.desc}
                </Text>
              </YStack>

              <XStack gap={16} alignItems="center" flexWrap="wrap" paddingTop={4}>
                <YStack gap={3}>
                  <Text fontSize={9} fontWeight="700" color="$color9">STANDARD</Text>
                  <TimestampBadge date={item.date} compact={false} size="sm" />
                </YStack>

                <YStack gap={3}>
                  <Text fontSize={9} fontWeight="700" color="$color9">COMPACT (TIGHT SCREENS)</Text>
                  <TimestampBadge date={item.date} compact={true} size="sm" />
                </YStack>
              </XStack>
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    );
  },
};

export const TightHeaderRealEstate: Story = {
  render: () => (
    <YStack padding={16} gap={16}>
      <Text fontSize={14} fontWeight="700">
        Simulated Header on 320px Mobile Screen (Hover/Tap badge for tooltip)
      </Text>

      {/* Standard Header with Clean Compact TimestampBadge */}
      <XStack
        height={54}
        width={320}
        backgroundColor="$color2"
        borderWidth={1}
        borderColor="$color5"
        paddingHorizontal={12}
        alignItems="center"
        justifyContent="space-between"
        borderRadius={8}
      >
        <XStack alignItems="center" gap={8}>
          <Text fontSize={16} fontWeight="800">
            #849201
          </Text>
          <TimestampBadge date={FOUR_HOURS_AGO} compact={true} size="sm" />
        </XStack>

        <XStack gap={6}>
          <YStack width={30} height={30} borderRadius={6} backgroundColor="$color4" alignItems="center" justifyContent="center">
            <Text fontSize={11} fontWeight="700">✕</Text>
          </YStack>
          <YStack width={30} height={30} borderRadius={6} backgroundColor="$color12" alignItems="center" justifyContent="center">
            <Text fontSize={11} fontWeight="700" color="$color1">✓</Text>
          </YStack>
        </XStack>
      </XStack>
    </YStack>
  ),
};

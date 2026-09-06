import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { AgeBadge, AgeBadgeProps } from '../../components/atoms/AgeBadge';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof AgeBadge> = {
  title: 'Atoms/AgeBadge',
  component: AgeBadge,
  decorators: [withFormFactor('mobile', 'Relative Age Badge (Elapsed Time)')],
  argTypes: {
    compact: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md'] },
    intent: { control: 'select', options: ['default', 'subtle', 'accent'] },
  },
};

export default meta;
type Story = StoryObj<typeof AgeBadge>;

// Mock relative age dates
const now = new Date();
const JUST_NOW = new Date(now.getTime() - 25 * 1000); // 25s ago
const TWELVE_MINS_AGO = new Date(now.getTime() - 12 * 60 * 1000); // 12m ago
const THREE_HOURS_AGO = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3h ago
const FIVE_DAYS_AGO = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5d ago
const TWO_MONTHS_AGO = new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000); // 2mo ago
const TWO_YEARS_AGO = new Date(now.getTime() - 740 * 24 * 60 * 60 * 1000); // 2y ago

export const AllTimeScales: Story = {
  render: () => {
    const samples = [
      { scale: 'Under 1 Minute', date: JUST_NOW, desc: 'Immediate live event' },
      { scale: 'Minutes (< 60m)', date: TWELVE_MINS_AGO, desc: 'Customer placed recently' },
      { scale: 'Hours (< 24h)', date: THREE_HOURS_AGO, desc: 'Same-day turnaround' },
      { scale: 'Days (< 30d)', date: FIVE_DAYS_AGO, desc: 'Multi-day operational cycle' },
      { scale: 'Months (< 12mo)', date: TWO_MONTHS_AGO, desc: 'Customer order history' },
      { scale: 'Years (>= 1y)', date: TWO_YEARS_AGO, desc: 'Long-term customer retention' },
    ];

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <YStack gap={16}>
          <YStack gap={4}>
            <Text fontSize={16} fontWeight="800">
              Relative Elapsed Time Scales
            </Text>
            <Text fontSize={12} color="$color10">
              Adaptive elapsed age calculation with standard vs compact modes and floating tooltips.
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
                  {item.scale}
                </Text>
                <Text fontSize={11} color="$color10">
                  {item.desc}
                </Text>
              </YStack>

              <XStack gap={16} alignItems="center" flexWrap="wrap" paddingTop={4}>
                <YStack gap={3}>
                  <Text fontSize={9} fontWeight="700" color="$color9">STANDARD</Text>
                  <AgeBadge date={item.date} compact={false} size="sm" />
                </YStack>

                <YStack gap={3}>
                  <Text fontSize={9} fontWeight="700" color="$color9">COMPACT (TIGHT)</Text>
                  <AgeBadge date={item.date} compact={true} size="sm" />
                </YStack>
              </XStack>
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    );
  },
};

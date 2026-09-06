import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export interface LogisticsMetrics {
  total: number;
  pending: number;
  inTransit: number;
  ndrAlerts: number;
}

export interface LogisticsMetricBannerProps {
  metrics: LogisticsMetrics;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

export function LogisticsMetricBanner({
  metrics,
  activeFilter,
  onSelectFilter,
}: LogisticsMetricBannerProps) {
  const { tokens } = useTheme();

  const items = [
    {
      id: 'All',
      label: 'TOTAL',
      value: metrics.total,
      color: tokens.text,
      badgeBg: tokens.surfaceRaised,
    },
    {
      id: 'PendingFulfillment',
      label: 'PENDING',
      value: metrics.pending,
      color: tokens.warning,
      badgeBg: `${tokens.warning}14`,
    },
    {
      id: 'InTransit',
      label: 'IN TRANSIT',
      value: metrics.inTransit,
      color: tokens.success,
      badgeBg: `${tokens.success}14`,
    },
    {
      id: 'NdrActionNeeded',
      label: 'NDR ALERTS',
      value: metrics.ndrAlerts,
      color: tokens.error,
      badgeBg: `${tokens.error}14`,
    },
  ];

  return (
    <XStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.lg}
      borderWidth={1}
      borderColor={tokens.border}
      paddingVertical={12}
      paddingHorizontal={8}
      alignItems="center"
      justifyContent="space-between"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.04}
      shadowRadius={8}
    >
      {items.map((item, idx) => {
        const isSelected = activeFilter === item.id;
        return (
          <React.Fragment key={item.id}>
            {idx > 0 && (
              <YStack
                width={1}
                height={32}
                backgroundColor={tokens.border}
                marginHorizontal={2}
              />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${item.label}: ${item.value}`}
              onPress={() => onSelectFilter?.(item.id)}
              style={
                {
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 4,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: isSelected ? item.badgeBg : 'transparent',
                  cursor: 'pointer',
                } as any
              }
            >
              <YStack alignItems="center" gap={3}>
                <Text
                  fontSize={10}
                  fontWeight="700"
                  color={tokens.textMuted}
                  letterSpacing={0.5}
                >
                  {item.label}
                </Text>
                <Text
                  fontSize={18}
                  fontWeight="800"
                  color={item.color}
                  letterSpacing={0.2}
                >
                  {item.value}
                </Text>
              </YStack>
            </Pressable>
          </React.Fragment>
        );
      })}
    </XStack>
  );
}

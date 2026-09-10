import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuClock } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface DonePlanningGateProps {
  isDonePlanning: boolean;
  onToggle: (isDone: boolean) => void;
}

export function DonePlanningGate({
  isDonePlanning,
  onToggle,
}: DonePlanningGateProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={tokens.radius.md}
      padding={12}
      gap={8}
      width="100%"
    >
      <XStack justifyContent="space-between" alignItems="center">
        <YStack flex={1} gap={2}>
          <Text fontSize={12} fontWeight="800" color={tokens.text}>
            Done with post planning?
          </Text>
          <Text fontSize={11} color={tokens.textSecondary}>
            {isDonePlanning
              ? 'Finalized · Ready in target channel queues'
              : 'In Progress · Keep in draft to assign more channels'}
          </Text>
        </YStack>

        <Pressable
          onPress={() => onToggle(!isDonePlanning)}
          style={[
            styles.togglePill,
            {
              backgroundColor: isDonePlanning ? '#15803D' : tokens.surfaceRaised,
              borderColor: isDonePlanning ? '#15803D' : tokens.border,
              borderWidth: 1,
            },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: isDonePlanning }}
          accessibilityLabel="Toggle post planning completion status"
        >
          {isDonePlanning ? (
            <LuCheck size={12} color="#FFFFFF" />
          ) : (
            <LuClock size={12} color={tokens.textSecondary} />
          )}
          <Text
            fontSize={11}
            fontWeight="800"
            color={isDonePlanning ? '#FFFFFF' : tokens.text}
          >
            {isDonePlanning ? 'Complete' : 'In Draft'}
          </Text>
        </Pressable>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
});

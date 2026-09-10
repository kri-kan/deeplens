import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';
import { TargetChannelOption } from '../post-planner.types';
import { TargetChannelAvatar } from '../TargetChannelAvatar';

export interface TargetChannelEligibilityPickerProps {
  channels: TargetChannelOption[];
  selectedChannelIds: string[];
  onToggleChannel: (channelId: string) => void;
  title?: string;
}

export function TargetChannelEligibilityPicker({
  channels,
  selectedChannelIds,
  onToggleChannel,
  title = 'Target Channel Eligibilities',
}: TargetChannelEligibilityPickerProps) {
  const { tokens } = useTheme();

  return (
    <YStack gap={8} width="100%">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={12} fontWeight="800" color={tokens.text}>
          {title}
        </Text>
        <Text fontSize={11} color={tokens.accent} fontWeight="800">
          {selectedChannelIds.length} Selected
        </Text>
      </XStack>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {channels.map((ch) => {
          const isChecked = selectedChannelIds.includes(ch.id);
          return (
            <TargetChannelAvatar
              key={ch.id}
              channel={ch}
              isSelected={isChecked}
              onPress={onToggleChannel}
              size="md"
            />
          );
        })}
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    gap: 14,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
});

import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSend, LuClock, LuBan } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { BottomSheet } from '../../atoms/BottomSheet';
import { PlannedProductInfo, TargetChannelOption } from '../../molecules/post-planner.types';
import { QuickSchedulePresetPicker } from '../../molecules/QuickSchedulePresetPicker';

export interface ShareActionModalProps {
  visible: boolean;
  product: PlannedProductInfo;
  channel: TargetChannelOption;
  onSharedNow: () => void;
  onScheduled: (scheduledAt: Date, presetLabel: string) => void;
  onExcludeChannel: () => void;
  onDismiss: () => void;
}

export function ShareActionModal({
  visible,
  product,
  channel,
  onSharedNow,
  onScheduled,
  onExcludeChannel,
  onDismiss,
}: ShareActionModalProps) {
  const { tokens } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  if (!visible) return null;

  const isFocus = channel.channelType === 'focus';

  const footerContent = (
    <Pressable
      onPress={onDismiss}
      style={[
        styles.cancelBtn,
        {
          backgroundColor: tokens.surfaceRaised,
          borderColor: tokens.border,
          borderWidth: 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Dismiss share modal"
    >
      <Text fontSize={13} fontWeight="700" color={tokens.text} textAlign="center">
        Dismiss
      </Text>
    </Pressable>
  );

  const headerRightBadge = (
    <View
      style={[
        styles.channelBadge,
        { backgroundColor: isFocus ? tokens.accentSubtle : '#F3E8FF' },
      ]}
    >
      <Text
        fontSize={11}
        fontWeight="800"
        color={isFocus ? tokens.accent : '#7E22CE'}
        textTransform="uppercase"
      >
        {isFocus ? '🎯 Focus' : '📦 Dump'}
      </Text>
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title={`@${channel.username}`}
      headerRight={headerRightBadge}
      zIndex={999}
      footer={footerContent}
    >
      <YStack gap={12} paddingHorizontal={2}>
        <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
          Post Publication Action:
        </Text>

        <ScrollView style={{ maxHeight: 310 }} showsVerticalScrollIndicator={false}>
          <YStack gap={10}>
            {/* Option 1: Shared Just Now */}
            <Pressable
              onPress={onSharedNow}
              style={({ pressed }) => [
                styles.mobileActionCard,
                {
                  backgroundColor: tokens.accent,
                  borderColor: tokens.accent,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Mark product as shared just now"
            >
              <XStack alignItems="center" gap={12}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                  <LuSend size={18} color={tokens.accentForeground} />
                </View>
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="800" color={tokens.accentForeground}>
                    Shared / Posted Just Now
                  </Text>
                  <Text fontSize={11} color={tokens.accentForeground} opacity={0.88}>
                    Mark as live on @{channel.username} story / feed
                  </Text>
                </YStack>
              </XStack>
            </Pressable>

            {/* Option 2: Schedule for Later with Preset Picker Molecule */}
            <YStack
              backgroundColor={tokens.surface}
              borderColor={selectedPreset ? tokens.accent : tokens.border}
              borderWidth={1}
              borderRadius={tokens.radius.md}
              padding={12}
              gap={10}
            >
              <XStack alignItems="center" gap={10}>
                <View style={[styles.iconCircle, { backgroundColor: tokens.surfaceRaised }]}>
                  <LuClock size={16} color={tokens.accent} />
                </View>
                <YStack flex={1}>
                  <Text fontSize={13} fontWeight="800" color={tokens.text}>
                    Scheduled in Meta Planner
                  </Text>
                  <Text fontSize={11} color={tokens.textMuted}>
                    Select slot when post will be published:
                  </Text>
                </YStack>
              </XStack>

              <QuickSchedulePresetPicker
                selectedPresetLabel={selectedPreset}
                onSelectPreset={(label, date) => {
                  setSelectedPreset(label);
                  onScheduled(date, label);
                }}
              />
            </YStack>

            {/* Option 3: Exclude from Channel */}
            <Pressable
              onPress={onExcludeChannel}
              style={({ pressed }) => [
                styles.mobileActionCard,
                {
                  backgroundColor: tokens.surface,
                  borderColor: '#FCA5A5',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Exclude from channel @${channel.username}`}
            >
              <XStack alignItems="center" gap={12}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <LuBan size={16} color="#DC2626" />
                </View>
                <YStack flex={1}>
                  <Text fontSize={13} fontWeight="700" color="#DC2626">
                    Exclude from @{channel.username}
                  </Text>
                  <Text fontSize={11} color={tokens.textMuted}>
                    Skip publishing for this channel, preserve for others
                  </Text>
                </YStack>
              </XStack>
            </Pressable>
          </YStack>
        </ScrollView>
      </YStack>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mobileActionCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { YStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { TargetChannelOption } from '../post-planner.types';

export interface TargetChannelAvatarProps {
  channel: TargetChannelOption;
  isSelected?: boolean;
  onPress?: (channelId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  showTypePill?: boolean;
}

export function TargetChannelAvatar({
  channel,
  isSelected = false,
  onPress,
  size = 'md',
  showBadge = true,
  showTypePill = true,
}: TargetChannelAvatarProps) {
  const { tokens } = useTheme();
  const isFocus = channel.channelType === 'focus';
  const initials = channel.username.substring(0, 2).toUpperCase();

  const avatarDimensions = size === 'sm' ? 44 : size === 'lg' ? 60 : 52;
  const ringColor = isFocus ? tokens.accent : '#7E22CE';

  return (
    <Pressable
      onPress={() => onPress?.(channel.id)}
      style={[styles.container, { width: avatarDimensions + 12 }]}
      accessibilityRole="button"
      accessibilityLabel={`Channel @${channel.username}, ${channel.channelType} channel`}
    >
      <View
        style={[
          styles.avatarContainer,
          {
            width: avatarDimensions,
            height: avatarDimensions,
            borderRadius: avatarDimensions / 2,
            borderColor: isSelected ? ringColor : tokens.border,
            borderWidth: isSelected ? 2.5 : 1.5,
            borderStyle: isFocus ? 'solid' : 'dashed',
          },
        ]}
      >
        {channel.avatarUri ? (
          <Image
            source={{ uri: channel.avatarUri }}
            style={[styles.avatarImg, { borderRadius: (avatarDimensions - 4) / 2 }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              {
                borderRadius: (avatarDimensions - 4) / 2,
                backgroundColor: isFocus ? '#EBF8FF' : '#F3E8FF',
              },
            ]}
          >
            <Text fontSize={size === 'sm' ? 10 : 12} fontWeight="800" color={isFocus ? '#2B6CB0' : '#7E22CE'}>
              {initials}
            </Text>
          </View>
        )}

        {/* Selection Checkmark Badge */}
        {isSelected && showBadge && (
          <View
            style={[
              styles.checkBadgeOverlay,
              { backgroundColor: ringColor },
            ]}
          >
            <LuCheck size={10} color="#FFFFFF" />
          </View>
        )}
      </View>

      <Text
        fontSize={11}
        fontWeight={isSelected ? '800' : '600'}
        color={isSelected ? tokens.text : tokens.textSecondary}
        numberOfLines={1}
        style={styles.channelLabel}
      >
        @{channel.username}
      </Text>

      {showTypePill && (
        <View
          style={[
            styles.typeMicroBadge,
            { backgroundColor: isFocus ? '#EBF8FF' : '#F3E8FF' },
          ]}
        >
          <Text fontSize={8} fontWeight="800" color={isFocus ? '#2B6CB0' : '#7E22CE'}>
            {isFocus ? '🎯 Focus' : '📦 Dump'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarContainer: {
    padding: 2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  channelLabel: {
    marginTop: 4,
    textAlign: 'center',
  },
  typeMicroBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
});

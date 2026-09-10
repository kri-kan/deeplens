import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { YStack, Text } from 'tamagui';
import { LuCheck } from '../icons/lu';
import { useTheme } from '@/theme';

export interface TargetChannelOption {
  id: string;
  username: string;
  displayName: string;
  channelType: 'focus' | 'dump';
  avatarUri?: string;
  isDefault?: boolean;
}

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
              styles.avatarPlaceholder,
              {
                borderRadius: (avatarDimensions - 4) / 2,
                backgroundColor: isFocus ? tokens.surfaceRaised : '#F3E8FF',
              },
            ]}
          >
            <Text
              fontSize={size === 'sm' ? 12 : 14}
              fontWeight="900"
              color={isFocus ? tokens.accent : '#7E22CE'}
            >
              {initials}
            </Text>
          </View>
        )}

        {/* Selected Checkmark Badge */}
        {isSelected && showBadge && (
          <View
            style={[
              styles.checkBadge,
              {
                backgroundColor: ringColor,
                borderColor: tokens.surface,
              },
            ]}
          >
            <LuCheck size={10} color="#ffffff" strokeWidth={3} />
          </View>
        )}
      </View>

      {/* Username */}
      <Text
        fontSize={10}
        fontWeight={isSelected ? '800' : '600'}
        color={isSelected ? tokens.text : tokens.textSecondary}
        numberOfLines={1}
        textAlign="center"
        style={styles.label}
      >
        @{channel.username}
      </Text>

      {/* Dump vs Focus Pill */}
      {showTypePill && (
        <View
          style={[
            styles.typePill,
            {
              backgroundColor: isFocus ? 'rgba(16,185,129,0.1)' : '#F3E8FF',
              borderColor: isFocus ? 'rgba(16,185,129,0.3)' : '#D8B4FE',
            },
          ]}
        >
          <Text
            fontSize={8}
            fontWeight="800"
            color={isFocus ? '#10B981' : '#7E22CE'}
            textTransform="uppercase"
          >
            {channel.channelType}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 3,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    maxWidth: 64,
  },
  typePill: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
});

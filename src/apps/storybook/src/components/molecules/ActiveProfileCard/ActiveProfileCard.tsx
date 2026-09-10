import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { YStack, Text } from 'tamagui';
import { LuPin, LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { InstagramExplorerProfile } from '../instagram-explorer.types';

export interface ActiveProfileCardProps {
  profile: InstagramExplorerProfile;
  isSelected?: boolean;
  onPress?: (profile: InstagramExplorerProfile) => void;
  onTogglePin?: (profile: InstagramExplorerProfile) => void;
}

export function ActiveProfileCard({
  profile,
  isSelected = false,
  onPress,
  onTogglePin,
}: ActiveProfileCardProps) {
  const { tokens } = useTheme();
  const avatarSize = 58;
  const initials = profile.username.substring(0, 2).toUpperCase();

  return (
    <Pressable
      onPress={() => onPress?.(profile)}
      style={({ pressed }) => [
        styles.container,
        {
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Instagram profile @${profile.username}`}
    >
      <View style={styles.avatarWrapper}>
        <View
          style={[
            styles.avatarRing,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderColor: isSelected ? tokens.accent : tokens.border,
              backgroundColor: tokens.surface,
            },
          ]}
        >
          {profile.avatarUri ? (
            <Image
              source={{ uri: profile.avatarUri }}
              style={[styles.avatarImage, { borderRadius: (avatarSize - 4) / 2 }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                {
                  borderRadius: (avatarSize - 4) / 2,
                  backgroundColor: tokens.accentSubtle || 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              <Text fontSize={13} fontWeight="800" color={tokens.accent}>
                {initials}
              </Text>
            </View>
          )}
        </View>

        {/* Top-Left Pin Badge */}
        {profile.isPinned && (
          <Pressable
            onPress={() => onTogglePin?.(profile)}
            style={[styles.pinBadge, { backgroundColor: '#1E293B' }]}
            hitSlop={6}
          >
            <LuPin size={9} color="#FFFFFF" />
          </Pressable>
        )}

        {/* Bottom-Right Active Sync Indicator */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: profile.isActive !== false ? '#10B981' : '#9CA3AF',
            },
          ]}
        >
          <LuCheck size={8} color="#FFFFFF" />
        </View>
      </View>

      <Text
        fontSize={11}
        fontWeight="600"
        color={tokens.text}
        numberOfLines={1}
        style={styles.username}
      >
        {profile.username}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 76,
    marginVertical: 6,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  username: {
    marginTop: 6,
    textAlign: 'center',
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'tamagui';

export interface DevicePlatformBadgeProps {
  platform: string;
  size?: 'sm' | 'md';
}

export const DevicePlatformBadge: React.FC<DevicePlatformBadgeProps> = ({
  platform,
  size = 'md',
}) => {
  const norm = (platform || 'web').toLowerCase();
  const isAndroid = norm === 'android';
  const isPWA = norm === 'pwa';
  const isIOS = norm === 'ios';

  const badgeStyle = isAndroid
    ? styles.badgeAndroid
    : isPWA
    ? styles.badgePWA
    : isIOS
    ? styles.badgeIOS
    : styles.badgeWeb;

  const textStyle = isAndroid
    ? styles.textAndroid
    : isPWA
    ? styles.textPWA
    : isIOS
    ? styles.textIOS
    : styles.textWeb;

  return (
    <View style={[styles.badgeBase, badgeStyle, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.textBase, textStyle, size === 'sm' && styles.textSm]}>
        {norm.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeBase: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textBase: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 9,
  },
  badgePWA: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  textPWA: {
    color: '#818CF8',
  },
  badgeAndroid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  textAndroid: {
    color: '#34D399',
  },
  badgeWeb: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
  },
  textWeb: {
    color: '#22D3EE',
  },
  badgeIOS: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  textIOS: {
    color: '#FB7185',
  },
});

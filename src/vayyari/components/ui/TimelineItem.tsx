import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';

interface TimelineItemProps {
  icon: string;
  iconBgColor?: string; // Hex or theme color key. Defaults to surfaceVariant
  iconColor?: string; // Hex or theme color key. Defaults to onSurfaceVariant
  title: string;
  timestampSubtitle: string;
  extraNode?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function TimelineItem({
  icon,
  iconBgColor,
  iconColor,
  title,
  timestampSubtitle,
  extraNode,
  style,
}: TimelineItemProps) {
  const theme = useTheme();

  // Resolution fallback if colors not provided
  const resolvedBg = iconBgColor || theme.colors.surfaceVariant;
  const resolvedColor = iconColor || theme.colors.onSurfaceVariant;

  return (
    <View style={[styles.timelineItem, style]}>
      <Avatar.Icon
        size={40}
        icon={icon}
        style={{ backgroundColor: resolvedBg }}
        color={resolvedColor}
      />
      <View style={styles.timelineText}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
          {title}
        </Text>
        {extraNode && <View style={styles.extraContent}>{extraNode}</View>}
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
          {timestampSubtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineText: {
    flex: 1,
    marginLeft: 16,
  },
  extraContent: {
    marginTop: 4,
  },
});

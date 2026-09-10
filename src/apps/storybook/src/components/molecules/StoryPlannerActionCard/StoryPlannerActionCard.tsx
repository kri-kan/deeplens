import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { YStack, Text } from 'tamagui';
import {
  LuCalendarCheck,
  LuShare2,
  LuHeart,
  LuSparkles,
  LuLayoutGrid,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { PlannerAction, PlannerActionId } from '../instagram-explorer.types';

export interface StoryPlannerActionCardProps {
  action: PlannerAction;
  onPress?: (id: PlannerActionId) => void;
  badgeCount?: number;
}

export function StoryPlannerActionCard({
  action,
  onPress,
  badgeCount = action.badgeCount,
}: StoryPlannerActionCardProps) {
  const { tokens } = useTheme();

  const getIcon = () => {
    const iconSize = 22;
    switch (action.id) {
      case 'curation':
        return <LuCalendarCheck size={iconSize} color="#059669" />;
      case 'sharing':
        return <LuShare2 size={iconSize} color="#2563EB" />;
      case 'swipes':
        return <LuHeart size={iconSize} color="#D97706" />;
      case 'review':
        return <LuSparkles size={iconSize} color="#DC2626" />;
      case 'post_planner':
      case 'incubator':
        return <LuLayoutGrid size={iconSize} color="#7E22CE" />;
      default:
        return <LuLayoutGrid size={iconSize} color={tokens.accent} />;
    }
  };

  const getIconBg = () => {
    switch (action.id) {
      case 'curation':
        return 'rgba(5, 150, 105, 0.08)';
      case 'sharing':
        return 'rgba(37, 99, 235, 0.08)';
      case 'swipes':
        return 'rgba(217, 119, 6, 0.08)';
      case 'review':
        return 'rgba(220, 38, 38, 0.08)';
      case 'post_planner':
      case 'incubator':
        return 'rgba(126, 34, 206, 0.08)';
      default:
        return 'rgba(0, 0, 0, 0.04)';
    }
  };

  return (
    <Pressable
      onPress={() => onPress?.(action.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          shadowColor: '#000000',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Planner ${action.title}`}
    >
      <View style={styles.iconWrapper}>
        <View style={[styles.iconBg, { backgroundColor: getIconBg() }]}>
          {getIcon()}
        </View>

        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text fontSize={10} fontWeight="800" color="#FFFFFF">
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>

      <Text
        fontSize={11}
        fontWeight="700"
        color={tokens.text}
        numberOfLines={1}
        style={styles.title}
      >
        {action.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 72,
    maxWidth: 88,
    aspectRatio: 0.95,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  title: {
    textAlign: 'center',
  },
});

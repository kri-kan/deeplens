import React from 'react';
import { View, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';
import { StoryPlannerAction, StoryPlannerActionId } from '../../molecules/instagram-explorer.types';
import { StoryPlannerActionCard } from '../../molecules/StoryPlannerActionCard';

export interface StoryPlannerQuickActionsProps {
  actions?: StoryPlannerAction[];
  onSelectAction?: (id: StoryPlannerActionId) => void;
  reviewBadgeCount?: number;
}

const DEFAULT_STORY_ACTIONS: StoryPlannerAction[] = [
  { id: 'curation', title: 'Curation' },
  { id: 'sharing', title: 'Sharing' },
  { id: 'swipes', title: 'Swipes' },
  { id: 'review', title: 'Review', badgeCount: 16 },
];

export function StoryPlannerQuickActions({
  actions = DEFAULT_STORY_ACTIONS,
  onSelectAction,
  reviewBadgeCount = 16,
}: StoryPlannerQuickActionsProps) {
  const { tokens } = useTheme();

  return (
    <YStack gap={10}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={14} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
          Story Planner
        </Text>
      </XStack>

      <XStack gap={10} justifyContent="space-between">
        {actions.map((action) => (
          <StoryPlannerActionCard
            key={action.id}
            action={action}
            badgeCount={action.id === 'review' ? reviewBadgeCount : action.badgeCount}
            onPress={onSelectAction}
          />
        ))}
      </XStack>
    </YStack>
  );
}

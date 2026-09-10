import React, { useState } from 'react';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuArrowLeft,
  LuCloud,
  LuClipboardList,
  LuRefreshCw,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
import {
  InstagramExplorerProfile,
  ProfileCategoryGroup,
  PlannerActionId,
  PlannerAction,
} from '../molecules/instagram-explorer.types';
import { StoryPlannerQuickActions } from '../organisms/StoryPlannerQuickActions';
import { StoryPlannerActionCard } from '../molecules/StoryPlannerActionCard';
import { ActiveProfilesSection } from '../organisms/ActiveProfilesSection';

export interface AdminInstagramExplorerPageProps {
  disableSafeArea?: boolean;
  categories?: ProfileCategoryGroup[];
  reviewBadgeCount?: number;
  postPlannerActions?: PlannerAction[];
  onBack?: () => void;
  onSync?: () => void;
  onOpenStoryQueue?: () => void;
  onSelectStoryAction?: (id: PlannerActionId) => void;
  onOpenPostPlanner?: (id?: PlannerActionId) => void;
  onSelectProfile?: (profile: InstagramExplorerProfile) => void;
}

export const DEFAULT_EXPLORER_PROFILES: InstagramExplorerProfile[] = [
  {
    id: 'p-1',
    username: 'vayyari_fashions',
    fullName: 'Vayyari Fashions',
    avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    isPinned: true,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-2',
    username: 'dressbyvayyari',
    fullName: 'Dress by Vayyari',
    avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-3',
    username: 'eclipsevayyari',
    fullName: 'Eclipse Vayyari',
    avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-4',
    username: 'editionsbyvayyari',
    fullName: 'Editions by Vayyari',
    avatarUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-5',
    username: 'everydayvayyari',
    fullName: 'Everyday Vayyari',
    avatarUri: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-6',
    username: 'theblouseedition',
    fullName: 'The Blouse Edition',
    avatarUri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-7',
    username: 'vayyari_littles',
    fullName: 'Vayyari Littles',
    avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-8',
    username: 'vayyariplusyou',
    fullName: 'Vayyari Plus You',
    avatarUri: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-9',
    username: 'vayyari_prive',
    fullName: 'Vayyari Privé',
    avatarUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
  {
    id: 'p-10',
    username: 'vayyaristudio',
    fullName: 'Vayyari Studio',
    avatarUri: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
    isPinned: false,
    isActive: true,
    profileCategory: 'mybusiness',
  },
];

export const DEFAULT_CATEGORY_GROUPS: ProfileCategoryGroup[] = [
  {
    id: 'mybusiness',
    title: 'My Business',
    isExpanded: true,
    profiles: DEFAULT_EXPLORER_PROFILES,
  },
  {
    id: 'general',
    title: 'My General',
    isExpanded: true,
    profiles: [
      {
        id: 'p-gen-1',
        username: 'vayyari_general',
        fullName: 'Vayyari General Inspiration',
        avatarUri: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200&q=80',
        isPinned: false,
        isActive: true,
        profileCategory: 'general',
      },
    ],
  },
  {
    id: 'competitors',
    title: 'Competitors',
    isExpanded: false,
    profiles: [
      {
        id: 'p-comp-1',
        username: 'sabyasachiofficial',
        fullName: 'Sabyasachi Mukherjee',
        avatarUri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=200&q=80',
        isPinned: false,
        isActive: true,
        profileCategory: 'competitors',
      },
      {
        id: 'p-comp-2',
        username: 'manishmalhotraworld',
        fullName: 'Manish Malhotra',
        avatarUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=200&q=80',
        isPinned: false,
        isActive: true,
        profileCategory: 'competitors',
      },
    ],
  },
];

const DEFAULT_POST_PLANNER_ACTIONS: PlannerAction[] = [
  { id: 'curation', title: 'Curation' },
  { id: 'post_planner', title: 'Post Planner' },
];

export function AdminInstagramExplorerPage({
  disableSafeArea = false,
  categories = DEFAULT_CATEGORY_GROUPS,
  reviewBadgeCount = 16,
  postPlannerActions = DEFAULT_POST_PLANNER_ACTIONS,
  onBack,
  onSync,
  onOpenStoryQueue,
  onSelectStoryAction,
  onOpenPostPlanner,
  onSelectProfile,
}: AdminInstagramExplorerPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncPress = () => {
    setIsSyncing(true);
    onSync?.();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top Navigation Bar */}
      <XStack
        paddingTop={topInset}
        height={54 + topInset}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={14}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack alignItems="center" gap={10}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <LuArrowLeft size={20} color={tokens.text} />
          </Pressable>

          <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.1}>
            Instagram Explorer
          </Text>
        </XStack>

        <XStack alignItems="center" gap={6}>
          {/* Cloud Sync Action */}
          <Pressable
            onPress={handleSyncPress}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sync instagram data"
          >
            {isSyncing ? (
              <LuRefreshCw size={19} color={tokens.accent} />
            ) : (
              <LuCloud size={20} color={tokens.textSecondary} />
            )}
          </Pressable>

          {/* Story Queue / Review Action */}
          <Pressable
            onPress={onOpenStoryQueue}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open story sharing queue"
          >
            <LuClipboardList size={20} color={tokens.textSecondary} />
          </Pressable>
        </XStack>
      </XStack>

      {/* Main Content Body */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24 + bottomInset,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Story Planner Quick Action Cards */}
        <StoryPlannerQuickActions
          onSelectAction={onSelectStoryAction}
          reviewBadgeCount={reviewBadgeCount}
        />

        {/* Section 2: Post Planner Small Tile(s) */}
        <YStack gap={10}>
          <Text fontSize={14} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
            Post Planner
          </Text>
          <XStack gap={10}>
            {postPlannerActions.map((action) => (
              <StoryPlannerActionCard
                key={action.id}
                action={action}
                onPress={(id) => onOpenPostPlanner?.(id)}
              />
            ))}
          </XStack>
        </YStack>

        {/* Section 3: Active Profiles Section */}
        <ActiveProfilesSection
          categories={categories}
          onSelectProfile={onSelectProfile}
        />
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

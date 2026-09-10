import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuChevronDown, LuChevronUp, LuCalendar, LuPackageOpen } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { TargetChannelOption, ChannelSharingQueueItem } from '../../molecules/post-planner.types';
import { TargetChannelCarousel } from '../TargetChannelCarousel';
import { PostSharingQueueTile } from '../../molecules/PostSharingQueueTile';

export interface PostPlannerSharingQueueProps {
  channels: TargetChannelOption[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  channelItems: ChannelSharingQueueItem[];
  onSelectItem: (item: ChannelSharingQueueItem) => void;
}

export function PostPlannerSharingQueue({
  channels,
  activeChannelId,
  onSelectChannel,
  channelItems,
  onSelectItem,
}: PostPlannerSharingQueueProps) {
  const { tokens } = useTheme();
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  return (
    <YStack flex={1} width="100%" backgroundColor={tokens.background}>
      {/* 1. Target Channel Selection Carousel */}
      <TargetChannelCarousel
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={onSelectChannel}
      />

      {/* 2. Collapsible Queue Section Header */}
      <Pressable
        onPress={() => setIsSectionCollapsed(!isSectionCollapsed)}
        style={[styles.sectionHeader, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
        accessibilityRole="button"
        accessibilityLabel="Toggle post queue section"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap={8}>
            <LuCalendar size={16} color={tokens.accent} />
            <Text fontSize={13} fontWeight="800" color={tokens.text}>
              Queue for @{activeChannel?.username} ({channelItems.length})
            </Text>
          </XStack>
          {isSectionCollapsed ? (
            <LuChevronDown size={18} color={tokens.textMuted} />
          ) : (
            <LuChevronUp size={18} color={tokens.textMuted} />
          )}
        </XStack>
      </Pressable>

      {/* 3. 3-Column Queue Media Grid or Empty State */}
      {!isSectionCollapsed && (
        <>
          {channelItems.length > 0 ? (
            <FlatList
              data={channelItems}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.gridContainer}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <PostSharingQueueTile item={item} onPress={onSelectItem} />
              )}
            />
          ) : (
            <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={12}>
              <LuPackageOpen size={40} color={tokens.textMuted} />
              <Text fontSize={15} fontWeight="800" color={tokens.text} textAlign="center">
                No Posts Assigned to @{activeChannel?.username}
              </Text>
              <Text fontSize={12} color={tokens.textSecondary} textAlign="center">
                Switch to Curation mode to assign starred garments to this channel's publishing queue.
              </Text>
            </YStack>
          )}
        </>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  gridContainer: {
    padding: 2,
    paddingBottom: 24,
  },
});

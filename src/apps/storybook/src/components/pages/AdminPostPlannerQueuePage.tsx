import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuArrowLeft, LuSparkles } from 'react-icons/lu';
import { useTheme } from '../../theme';
import {
  PlannedProductInfo,
  TargetChannelOption,
  ChannelSharingQueueItem,
} from '../molecules/post-planner.types';
import { PostPlannerSharingQueue } from '../organisms/PostPlannerSharingQueue';
import { ShareActionModal } from '../organisms/ShareActionModal';
import { DEFAULT_CHANNELS, DEFAULT_PRODUCTS } from './AdminPostPlannerPage';

export interface AdminPostPlannerQueuePageProps {
  channels?: TargetChannelOption[];
  products?: PlannedProductInfo[];
  activeChannelId?: string;
  onSelectChannel?: (channelId: string) => void;
  queueItems?: ChannelSharingQueueItem[];
  shareModalOpen?: boolean;
  selectedShareItem?: ChannelSharingQueueItem | null;
  onSelectItem?: (item: ChannelSharingQueueItem) => void;
  onShareAction?: (
    action: 'shared_now' | 'scheduled' | 'excluded',
    timeLabel?: string,
    item?: ChannelSharingQueueItem,
    channelId?: string
  ) => void;
  onBack?: () => void;
  onNavigateToCuration?: () => void;
}

export function AdminPostPlannerQueuePage({
  channels = DEFAULT_CHANNELS,
  products = DEFAULT_PRODUCTS,
  activeChannelId: controlledChannelId,
  onSelectChannel,
  queueItems: controlledQueueItems,
  shareModalOpen: controlledShareOpen,
  selectedShareItem: controlledShareItem,
  onSelectItem,
  onShareAction,
  onBack,
  onNavigateToCuration,
}: AdminPostPlannerQueuePageProps) {
  const { tokens } = useTheme();

  // Channel State
  const [internalChannelId, setInternalChannelId] = useState(channels[2]?.id || 'ch-3');
  const activeChannelId = controlledChannelId !== undefined ? controlledChannelId : internalChannelId;
  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  const handleSelectChannel = (chId: string) => {
    setInternalChannelId(chId);
    onSelectChannel?.(chId);
  };

  // Statuses per channel
  const [channelStatuses, setChannelStatuses] = useState<
    Record<string, { status: 'assigned' | 'scheduled' | 'shared' | 'excluded'; timeLabel?: string }>
  >({
    'sku-001_ch-3': { status: 'scheduled', timeLabel: 'Tomorrow 11 AM' },
    'sku-001_ch-1': { status: 'shared', timeLabel: 'Today 10 AM' },
    'sku-002_ch-3': { status: 'assigned' },
    'sku-005_ch-3': { status: 'shared', timeLabel: 'Yesterday' },
  });

  // Modal State
  const [internalShareOpen, setInternalShareOpen] = useState(false);
  const [internalShareItem, setInternalShareItem] = useState<ChannelSharingQueueItem | null>(null);

  const isShareOpen = controlledShareOpen !== undefined ? controlledShareOpen : internalShareOpen;
  const targetShareItem =
    controlledShareItem ||
    internalShareItem || {
      ...(products[0] || DEFAULT_PRODUCTS[0]),
      status: 'assigned',
    };

  const handleOpenShare = (item: ChannelSharingQueueItem) => {
    setInternalShareItem(item);
    setInternalShareOpen(true);
    onSelectItem?.(item);
  };

  const handleRecordShareAction = (
    action: 'shared_now' | 'scheduled' | 'excluded',
    timeLabel?: string
  ) => {
    if (!targetShareItem) return;
    const key = `${targetShareItem.id}_${activeChannelId}`;
    const newStatus =
      action === 'shared_now' ? 'shared' : action === 'scheduled' ? 'scheduled' : 'excluded';

    setChannelStatuses((prev) => ({
      ...prev,
      [key]: {
        status: newStatus,
        timeLabel:
          action === 'scheduled' ? timeLabel : action === 'shared_now' ? 'Just Now' : undefined,
      },
    }));

    onShareAction?.(action, timeLabel, targetShareItem, activeChannelId);
    setInternalShareOpen(false);
  };

  // Derive Sharing Items for active channel if not provided via props
  const derivedQueueItems: ChannelSharingQueueItem[] =
    controlledQueueItems ||
    products
      .filter((item) => item.assignedChannelIds?.includes(activeChannelId))
      .map((item) => {
        const key = `${item.id}_${activeChannelId}`;
        const statusInfo = channelStatuses[key] || { status: 'assigned' };
        return {
          ...item,
          status: statusInfo.status,
          scheduledTimeLabel: statusInfo.timeLabel,
        };
      });

  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={440}
      alignSelf="center"
      backgroundColor={tokens.background}
      position="relative"
      overflow="hidden"
    >
      {/* ── TOP NAV BAR ── */}
      <YStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack
          paddingHorizontal={14}
          paddingVertical={12}
          alignItems="center"
          justifyContent="space-between"
        >
          <XStack alignItems="center" gap={10} flex={1}>
            {onBack && (
              <Pressable
                onPress={onBack}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <LuArrowLeft size={22} color={tokens.text} />
              </Pressable>
            )}
            <YStack flex={1}>
              <Text fontSize={17} fontWeight="800" color={tokens.text}>
                Post Planner
              </Text>
              <Text fontSize={11} color={tokens.textMuted} numberOfLines={1}>
                {activeChannel
                  ? `Publishing queue for @${activeChannel.username}`
                  : 'Select channel to view queue'}
              </Text>
            </YStack>
          </XStack>

          {onNavigateToCuration && (
            <Pressable
              onPress={onNavigateToCuration}
              hitSlop={8}
              style={({ pressed }) => [
                styles.shortcutBtn,
                {
                  backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
                  borderColor: tokens.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Switch to curation grid"
            >
              <LuSparkles size={15} color={tokens.accent} />
              <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                Curation
              </Text>
            </Pressable>
          )}
        </XStack>
      </YStack>

      {/* ── POST PLANNER SHARING QUEUE ORGANISM ── */}
      <PostPlannerSharingQueue
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        channelItems={derivedQueueItems}
        onSelectItem={handleOpenShare}
      />

      {/* ── SHARE ACTION MODAL ── */}
      <ShareActionModal
        visible={isShareOpen}
        product={targetShareItem}
        channel={activeChannel}
        onSharedNow={() => handleRecordShareAction('shared_now')}
        onScheduled={(date, label) => handleRecordShareAction('scheduled', label)}
        onExcludeChannel={() => handleRecordShareAction('excluded')}
        onDismiss={() => setInternalShareOpen(false)}
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});

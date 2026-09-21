import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuSparkles,
  LuLayers,
  LuCheckCheck,
  LuTrash2,
  LuRefreshCw,
  LuUserCheck,
  LuUsers,
  LuEdit3,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  TargetCollabAccount,
} from '../molecules/TargetCollabAccountPicker';
import {
  CollabCurationModal,
  CollabPostItem,
} from '../organisms/CollabCurationModal';
import {
  DEFAULT_COLLAB_ACCOUNTS,
  getChannelColor,
} from './AdminCollabPlannerPage';

export interface AdminCollabQueuePageProps {
  queueItems?: CollabPostItem[];
  accounts?: TargetCollabAccount[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onUnqueueItem?: (postId: string) => void;
  onClearQueue?: () => void;
  onUpdateTargets?: (postId: string, newTargets: string[]) => void;
  onBack?: () => void;
}

export function AdminCollabQueuePage({
  queueItems: initialQueueItems = [],
  accounts = DEFAULT_COLLAB_ACCOUNTS,
  loading = false,
  refreshing = false,
  onRefresh,
  onUnqueueItem,
  onClearQueue,
  onUpdateTargets,
  onBack,
}: AdminCollabQueuePageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets?.top || 0, 12);

  const [editingPost, setEditingPost] = useState<CollabPostItem | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const handleOpenEdit = (post: CollabPostItem) => {
    setEditingPost(post);
    setModalOpen(true);
  };

  const handleCloseEdit = () => {
    setModalOpen(false);
    setEditingPost(null);
  };

  const handleSaveEdit = (postId: string, newTargets: string[]) => {
    onUpdateTargets?.(postId, newTargets);
    handleCloseEdit();
  };

  const handleConfirmClear = () => {
    if (!onClearQueue) return;
    Alert.alert(
      'Clear Automation Queue',
      `Are you sure you want to remove all ${initialQueueItems.length} post(s) from the automation queue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: onClearQueue },
      ]
    );
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* ── Top Bar Header with Notch Clearance ── */}
      <XStack
        paddingHorizontal={16}
        paddingTop={topInset + 6}
        paddingBottom={12}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        backgroundColor={tokens.surface}
      >
        <XStack alignItems="center" gap={10} flex={1}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack flex={1}>
            <XStack alignItems="center" gap={8}>
              <Text fontSize={18} fontWeight="900" color={tokens.text} numberOfLines={1}>
                Collab Queue
              </Text>
              <View style={styles.countBadge}>
                <Text fontSize={11} fontWeight="800" color="#7E22CE">
                  {initialQueueItems.length}
                </Text>
              </View>
            </XStack>
            <Text fontSize={11} color={tokens.textSecondary} numberOfLines={1}>
              Active jobs ready for AVD automation
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap={8}>
          {onRefresh && (
            <Pressable
              onPress={onRefresh}
              hitSlop={8}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Refresh Queue"
            >
              <LuRefreshCw size={16} color={tokens.textSecondary} />
            </Pressable>
          )}

          {initialQueueItems.length > 0 && onClearQueue && (
            <Pressable
              onPress={handleConfirmClear}
              hitSlop={8}
              style={[styles.iconButton, { backgroundColor: '#FEE2E2' }]}
              accessibilityRole="button"
              accessibilityLabel="Clear All Queue Items"
            >
              <LuTrash2 size={16} color="#DC2626" />
            </Pressable>
          )}
        </XStack>
      </XStack>

      {/* ── Main Content ── */}
      {loading && initialQueueItems.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={32} gap={12}>
          <ActivityIndicator size="large" color="#7E22CE" />
          <Text fontSize={13} fontWeight="600" color={tokens.textSecondary}>
            Loading automation queue...
          </Text>
        </YStack>
      ) : initialQueueItems.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={32} gap={14}>
          <View style={styles.emptyIconCircle}>
            <LuCheckCheck size={38} color="#059669" />
          </View>
          <Text fontSize={17} fontWeight="900" color={tokens.text} textAlign="center">
            Queue is Empty
          </Text>
          <Text
            fontSize={12}
            color={tokens.textSecondary}
            textAlign="center"
            maxWidth={280}
            lineHeight={18}
          >
            No posts are currently queued for collaboration automation. Select posts in the Collab Planner and choose target accounts to queue them.
          </Text>
          {onBack && (
            <Pressable
              onPress={onBack}
              style={styles.emptyCtaButton}
              accessibilityRole="button"
              accessibilityLabel="Go to Collab Planner"
            >
              <LuLayers size={15} color="#FFFFFF" />
              <Text fontSize={13} fontWeight="800" color="#FFFFFF">
                Go to Collab Planner
              </Text>
            </Pressable>
          )}
        </YStack>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#7E22CE']}
                tintColor="#7E22CE"
              />
            ) : undefined
          }
        >
          {/* AVD Automation Status Banner */}
          <View style={styles.automationBanner}>
            <XStack alignItems="center" gap={10}>
              <View style={styles.bannerIconCircle}>
                <LuSparkles size={18} color="#7E22CE" />
              </View>
              <YStack flex={1}>
                <Text fontSize={13} fontWeight="900" color="#581C87">
                  AVD Automation Queue Active
                </Text>
                <Text fontSize={11} color="#6B21A8" lineHeight={15}>
                  {initialQueueItems.length} post(s) ready. Scripts will invite collaborators and auto-switch profiles to accept.
                </Text>
              </YStack>
            </XStack>
          </View>

          {/* Queue Items List */}
          <YStack gap={12}>
            {initialQueueItems.map((item, idx) => {
              const targetAccounts = item.targetCollabAccounts || [];

              return (
                <View key={item.id || idx} style={styles.queueCard}>
                  <XStack gap={12} alignItems="flex-start">
                    {/* Thumbnail */}
                    <Image
                      source={{ uri: item.thumbnailUrl }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />

                    {/* Meta info */}
                    <YStack flex={1} gap={4}>
                      <XStack alignItems="center" justifyContent="space-between">
                        <XStack alignItems="center" gap={6}>
                          <View
                            style={[
                              styles.brandDot,
                              { backgroundColor: getChannelColor(item.ownerUsername || '') },
                            ]}
                          />
                          <Text fontSize={12} fontWeight="900" color={tokens.text}>
                            @{item.ownerUsername}
                          </Text>
                        </XStack>

                        <View style={styles.queuedBadge}>
                          <Text fontSize={9} fontWeight="800" color="#7E22CE">
                            QUEUED
                          </Text>
                        </View>
                      </XStack>

                      {item.caption ? (
                        <Text
                          fontSize={11}
                          color={tokens.textSecondary}
                          numberOfLines={2}
                          lineHeight={15}
                        >
                          {item.caption}
                        </Text>
                      ) : null}

                      {item.postedAt ? (
                        <Text fontSize={10} color="#9CA3AF">
                          Posted: {item.postedAt}
                        </Text>
                      ) : null}
                    </YStack>
                  </XStack>

                  {/* Target Collaborators Strip */}
                  <YStack marginTop={10} paddingTop={10} borderTopWidth={1} borderTopColor="#F3F4F6" gap={6}>
                    <XStack alignItems="center" justifyContent="space-between">
                      <XStack alignItems="center" gap={4}>
                        <LuUsers size={12} color="#7E22CE" />
                        <Text fontSize={11} fontWeight="800" color="#4B5563">
                          Target Collaborators ({targetAccounts.length}/5)
                        </Text>
                      </XStack>
                    </XStack>

                    <XStack flexWrap="wrap" gap={6}>
                      {targetAccounts.map((handle) => (
                        <View key={handle} style={styles.collabChip}>
                          <View
                            style={[
                              styles.chipDot,
                              { backgroundColor: getChannelColor(handle) },
                            ]}
                          />
                          <Text fontSize={11} fontWeight="700" color="#374151">
                            @{handle}
                          </Text>
                        </View>
                      ))}
                    </XStack>
                  </YStack>

                  {/* Actions Footer */}
                  <XStack marginTop={12} justifyContent="flex-end" gap={8}>
                    <Pressable
                      onPress={() => handleOpenEdit(item)}
                      style={styles.actionBtnSecondary}
                      accessibilityRole="button"
                      accessibilityLabel="Edit Collaborators"
                    >
                      <LuEdit3 size={13} color="#4B5563" />
                      <Text fontSize={11} fontWeight="700" color="#4B5563">
                        Edit Targets
                      </Text>
                    </Pressable>

                    {onUnqueueItem && (
                      <Pressable
                        onPress={() => onUnqueueItem(item.id)}
                        style={styles.actionBtnDanger}
                        accessibilityRole="button"
                        accessibilityLabel="Unqueue Post"
                      >
                        <LuTrash2 size={13} color="#DC2626" />
                        <Text fontSize={11} fontWeight="700" color="#DC2626">
                          Unqueue
                        </Text>
                      </Pressable>
                    )}
                  </XStack>
                </View>
              );
            })}
          </YStack>
        </ScrollView>
      )}

      {/* ── Edit Targets Modal ── */}
      {editingPost && (
        <CollabCurationModal
          visible={modalOpen}
          post={editingPost}
          accounts={accounts}
          initialSelectedAccountIds={editingPost.targetCollabAccounts || []}
          onClose={handleCloseEdit}
          onMarkCurated={handleSaveEdit}
          onQueueAutomation={handleSaveEdit}
        />
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  countBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  automationBanner: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  bannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  queuedBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  collabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7E22CE',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
});

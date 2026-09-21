import React, { useState, useEffect, useMemo } from 'react';
import { View, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuX,
  LuCheck,
  LuSparkles,
  LuUsers,
  LuCalendar,
  LuHeart,
  LuMessageCircle,
} from '../../icons/lu';
import { useTheme } from '@/theme';
import {
  TargetCollabAccountPicker,
  TargetCollabAccount,
} from '../../molecules/TargetCollabAccountPicker';

export interface CollabPostItem {
  id: string;
  thumbnailUrl: string;
  mediaUrl?: string;
  ownerUsername: string;
  ownerAvatarUri?: string;
  caption?: string;
  postedAt?: string;
  likes?: number;
  comments?: number;
  collaborators?: string[];
  targetCollabAccounts?: string[];
  curationStatus?: 'pending' | 'curated' | 'queued' | 'completed';
}

export interface CollabCurationModalProps {
  visible: boolean;
  post: CollabPostItem | null;
  accounts: TargetCollabAccount[];
  initialSelectedAccountIds?: string[];
  onClose: () => void;
  onMarkCurated: (postId: string, selectedAccountIds: string[]) => void;
  onQueueAutomation: (postId: string, selectedAccountIds: string[]) => void;
}

export function CollabCurationModal({
  visible,
  post,
  accounts,
  initialSelectedAccountIds,
  onClose,
  onMarkCurated,
  onQueueAutomation,
}: CollabCurationModalProps) {
  const { tokens } = useTheme();

  // Baseline target accounts for change detection from post
  const baselineIds = useMemo(() => {
    return [...(post?.targetCollabAccounts || [])].sort();
  }, [post?.id, post?.targetCollabAccounts]);

  const initialSelection = useMemo(() => {
    if (initialSelectedAccountIds !== undefined) {
      return [...initialSelectedAccountIds].sort();
    }
    return baselineIds;
  }, [initialSelectedAccountIds, baselineIds]);

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(initialSelection);

  // Synchronize when post or modal opens
  useEffect(() => {
    setSelectedAccountIds(initialSelection);
  }, [initialSelection, visible]);

  // Filter out the post's owner account so the channel cannot collaborate with itself
  const eligibleAccounts = useMemo(() => {
    if (!post?.ownerUsername) return accounts;
    const owner = post.ownerUsername.toLowerCase();
    return accounts.filter(
      (acc) =>
        acc.username.toLowerCase() !== owner &&
        acc.id.toLowerCase() !== owner
    );
  }, [accounts, post?.ownerUsername]);

  if (!visible || !post) return null;

  // Change detection: compare selectedAccountIds with baselineIds
  const currentSorted = [...selectedAccountIds].sort();
  const hasChanges =
    currentSorted.length !== baselineIds.length ||
    currentSorted.some((id, idx) => id !== baselineIds[idx]);

  const handleToggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const statusColorMap: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#FEF3C7', text: '#D97706' },
    curated: { bg: '#ECFDF5', text: '#059669' },
    queued: { bg: '#F3E8FF', text: '#7E22CE' },
    completed: { bg: '#EFF6FF', text: '#2563EB' },
  };

  const currentStatus = post.curationStatus || 'pending';
  const statusBadge = statusColorMap[currentStatus] || statusColorMap.pending;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal={18}
            paddingTop={16}
            paddingBottom={12}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
            <XStack alignItems="center" gap={8}>
              <View style={styles.ownerAvatar}>
                {post.ownerAvatarUri ? (
                  <Image source={{ uri: post.ownerAvatarUri }} style={styles.ownerAvatarImg} contentFit="cover" />
                ) : (
                  <Text fontSize={11} fontWeight="800" color="#374151">
                    {post.ownerUsername.substring(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>
              <YStack>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  @{post.ownerUsername}
                </Text>
                <XStack alignItems="center" gap={4}>
                  <LuCalendar size={11} color={tokens.textSecondary} />
                  <Text fontSize={10} color={tokens.textSecondary}>
                    {post.postedAt || 'Recently posted'}
                  </Text>
                </XStack>
              </YStack>
            </XStack>

            <XStack alignItems="center" gap={8}>
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <Text fontSize={10} fontWeight="800" color={statusBadge.text}>
                  {currentStatus.toUpperCase()}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close Modal"
              >
                <LuX size={18} color={tokens.textSecondary} />
              </Pressable>
            </XStack>
          </XStack>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Post Preview Row: Thumbnail + Caption Snippet */}
            <XStack gap={12} alignItems="flex-start">
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: post.thumbnailUrl }}
                  style={styles.thumbnailImg}
                  contentFit="cover"
                />
              </View>

              <YStack flex={1} gap={6}>
                {/* Stats Row */}
                <XStack gap={12} alignItems="center">
                  <XStack alignItems="center" gap={3}>
                    <LuHeart size={12} color="#EF4444" />
                    <Text fontSize={11} fontWeight="700" color={tokens.text}>
                      {post.likes !== undefined ? post.likes.toLocaleString() : '1.2k'}
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap={3}>
                    <LuMessageCircle size={12} color="#3B82F6" />
                    <Text fontSize={11} fontWeight="700" color={tokens.text}>
                      {post.comments !== undefined ? post.comments.toLocaleString() : '84'}
                    </Text>
                  </XStack>
                </XStack>

                {/* Caption Snippet */}
                <Text
                  fontSize={11}
                  color={tokens.textSecondary}
                  lineHeight={15}
                  numberOfLines={3}
                >
                  {post.caption || 'Special handloom curation with tested zari embellishments and exquisite borders.'}
                </Text>

                {/* Currently Collabing Badge if post has existing collaborators */}
                {post.collaborators && post.collaborators.length > 0 && (
                  <YStack gap={4} marginTop={4}>
                    <XStack alignItems="center" gap={4}>
                      <LuUsers size={12} color="#7E22CE" />
                      <Text fontSize={11} fontWeight="800" color="#7E22CE">
                        Currently Collabing:
                      </Text>
                    </XStack>
                    <XStack flexWrap="wrap" gap={4}>
                      {post.collaborators.map((username) => (
                        <View key={username} style={styles.collaboratorChip}>
                          <Text fontSize={10} fontWeight="700" color="#6B21A8">
                            @{username}
                          </Text>
                        </View>
                      ))}
                    </XStack>
                  </YStack>
                )}
              </YStack>
            </XStack>

            <View style={styles.divider} />

            {/* Target Collab Multi-Selector */}
            <TargetCollabAccountPicker
              accounts={eligibleAccounts}
              selectedAccountIds={selectedAccountIds}
              onToggleAccount={handleToggleAccount}
              maxSelections={5}
              title="Select Intended Collab Accounts (Up to 5)"
              layout="grid"
            />
          </ScrollView>

          {/* Dynamic Action Buttons Footer */}
          <YStack
            paddingHorizontal={16}
            paddingVertical={12}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            backgroundColor="#FAFAFA"
            gap={8}
          >
            {hasChanges ? (
              // When changes are made:
              // Primary CTA -> "Queue for Collab Automation" (prominent purple)
              // Secondary CTA -> "Mark as Collab Curated" (subtle outlined)
              <>
                <Pressable
                  style={styles.primaryQueueBtn}
                  onPress={() => onQueueAutomation(post.id, selectedAccountIds)}
                  accessibilityRole="button"
                  accessibilityLabel="Queue for Collab Automation"
                >
                  <LuSparkles size={16} color="#FFFFFF" />
                  <Text fontSize={13} fontWeight="800" color="#FFFFFF">
                    Queue for Collab Automation
                  </Text>
                </Pressable>

                <XStack gap={8}>
                  <Pressable
                    style={styles.secondaryCurateBtn}
                    onPress={() => onMarkCurated(post.id, selectedAccountIds)}
                    accessibilityRole="button"
                    accessibilityLabel="Mark as Collab Curated"
                  >
                    <LuCheck size={14} color="#059669" />
                    <Text fontSize={12} fontWeight="700" color="#059669">
                      Mark as Collab Curated
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.cancelBtn}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text fontSize={12} fontWeight="600" color="#6B7280">
                      Cancel
                    </Text>
                  </Pressable>
                </XStack>
              </>
            ) : (
              // When NO changes are made:
              // Primary CTA -> "Mark as Collab Curated" (green button)
              <XStack gap={8}>
                <Pressable
                  style={styles.primaryCurateBtn}
                  onPress={() => onMarkCurated(post.id, selectedAccountIds)}
                  accessibilityRole="button"
                  accessibilityLabel="Mark as Collab Curated"
                >
                  <LuCheck size={16} color="#FFFFFF" />
                  <Text fontSize={13} fontWeight="800" color="#FFFFFF">
                    Mark as Collab Curated
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.cancelBtn}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text fontSize={12} fontWeight="600" color="#6B7280">
                    Cancel
                  </Text>
                </Pressable>
              </XStack>
            )}
          </YStack>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ownerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ownerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  thumbnailContainer: {
    width: 88,
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  collaboratorChip: {
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  primaryQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7E22CE',
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#7E22CE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  secondaryCurateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1.5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryCurateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
});

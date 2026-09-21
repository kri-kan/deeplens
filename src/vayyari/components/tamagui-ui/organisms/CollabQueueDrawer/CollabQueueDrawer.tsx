import React from 'react';
import { View, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuX,
  LuSparkles,
  LuClock,
  LuUsers,
  LuLayers,
} from '../../icons/lu';
import { useTheme } from '@/theme';
import { CollabPostItem } from '../CollabCurationModal';
import { getChannelColor } from '../../molecules/TargetCollabAccountPicker';

export interface CollabQueueDrawerProps {
  visible: boolean;
  onClose: () => void;
  queueItems: CollabPostItem[];
  onRemoveItem?: (postId: string) => void;
  onSelectPost?: (post: CollabPostItem) => void;
}

export function CollabQueueDrawer({
  visible,
  onClose,
  queueItems = [],
  onRemoveItem,
  onSelectPost,
}: CollabQueueDrawerProps) {
  const { tokens } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetCard}>
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
              <View style={styles.headerIconCircle}>
                <LuSparkles size={16} color="#7E22CE" />
              </View>
              <YStack>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={15} fontWeight="900" color={tokens.text}>
                    Collab Automation Queue
                  </Text>
                  <View style={styles.queueCountBadge}>
                    <Text fontSize={11} fontWeight="800" color="#7E22CE">
                      {queueItems.length}
                    </Text>
                  </View>
                </XStack>
                <Text fontSize={11} color={tokens.textSecondary}>
                  AVD Maestro runs automated invite & accept flows
                </Text>
              </YStack>
            </XStack>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close Queue"
            >
              <LuX size={18} color={tokens.textSecondary} />
            </Pressable>
          </XStack>

          {/* Info Banner */}
          <XStack
            backgroundColor="#F3E8FF"
            paddingHorizontal={16}
            paddingVertical={10}
            alignItems="center"
            gap={8}
          >
            <LuClock size={14} color="#7E22CE" />
            <Text fontSize={11} color="#6B21A8" fontWeight="600" flex={1}>
              Queue Runner polls pending posts and executes multi-account collaborations on AVD emulator.
            </Text>
          </XStack>

          {/* Queue Content List */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {queueItems.length === 0 ? (
              <YStack alignItems="center" justifyContent="center" paddingVertical={48} gap={12}>
                <View style={styles.emptyIconCircle}>
                  <LuLayers size={32} color="#9CA3AF" />
                </View>
                <Text fontSize={15} fontWeight="800" color={tokens.text} textAlign="center">
                  Queue is empty
                </Text>
                <Text fontSize={12} color={tokens.textSecondary} textAlign="center" maxWidth={260}>
                  Select any post in the Collab Planner and pick intended collaboration accounts to queue automation.
                </Text>
              </YStack>
            ) : (
              <YStack gap={10}>
                {queueItems.map((item, idx) => {
                  const targetAccounts = item.targetCollabAccounts || [];

                  return (
                    <View key={item.id || idx} style={styles.queueItemCard}>
                      <XStack gap={12} alignItems="center">
                        {/* Thumbnail */}
                        <Pressable
                          onPress={() => {
                            onSelectPost?.(item);
                            onClose();
                          }}
                          style={styles.thumbnailWrapper}
                        >
                          <Image
                            source={{ uri: item.thumbnailUrl }}
                            style={styles.thumbnailImg}
                            contentFit="cover"
                          />
                          <View style={styles.queueOrderBadge}>
                            <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                              #{idx + 1}
                            </Text>
                          </View>
                        </Pressable>

                        {/* Post Info */}
                        <YStack flex={1} gap={4}>
                          <XStack justifyContent="space-between" alignItems="center">
                            <Text fontSize={13} fontWeight="800" color={tokens.text}>
                              @{item.ownerUsername}
                            </Text>
                            <View style={styles.statusPill}>
                              <Text fontSize={9} fontWeight="800" color="#7E22CE">
                                QUEUED
                              </Text>
                            </View>
                          </XStack>

                          {item.caption ? (
                            <Text fontSize={11} color={tokens.textSecondary} numberOfLines={1}>
                              {item.caption}
                            </Text>
                          ) : null}

                          {/* Target Accounts Row */}
                          <YStack gap={4} marginTop={4}>
                            <XStack alignItems="center" gap={4}>
                              <LuUsers size={11} color="#6B7280" />
                              <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                                Target Collabs ({targetAccounts.length}):
                              </Text>
                            </XStack>

                            <XStack flexWrap="wrap" gap={4}>
                              {targetAccounts.map((handle) => {
                                const phaseInfo = (item.channelPhases || []).find(
                                  (p) => p.username.toLowerCase() === handle.toLowerCase()
                                );
                                const phase = phaseInfo?.phase || 'suggested';
                                const chipColor = getChannelColor(handle);

                                const isInvited = phase === 'invited';
                                const isAccepted = phase === 'accepted';
                                const isAlready = phase === 'already_collaborating';
                                const isFailed = phase === 'failed';

                                let bg = chipColor + '15';
                                let border = chipColor + '40';
                                let textColor = chipColor;
                                let icon = '⏳';
                                let label = 'Suggested';

                                if (isAlready || isAccepted) {
                                  bg = '#ECFDF5';
                                  border = '#10B981';
                                  textColor = '#047857';
                                  icon = isAlready ? '🤝' : '✓';
                                  label = isAlready ? 'Active' : 'Accepted';
                                } else if (isInvited) {
                                  bg = '#FEF3C7';
                                  border = '#F59E0B';
                                  textColor = '#B45309';
                                  icon = '📩';
                                  label = 'Invited';
                                } else if (isFailed) {
                                  bg = '#FEE2E2';
                                  border = '#EF4444';
                                  textColor = '#B91C1C';
                                  icon = '⚠';
                                  label = 'Failed';
                                }

                                return (
                                  <View
                                    key={handle}
                                    style={[
                                      styles.collabChip,
                                      { backgroundColor: bg, borderColor: border },
                                    ]}
                                  >
                                    <Text fontSize={10} fontWeight="700" color={textColor}>
                                      {icon} @{handle} • {label}
                                    </Text>
                                  </View>
                                );
                              })}
                            </XStack>
                          </YStack>
                        </YStack>
                      </XStack>
                    </View>
                  );
                })}
              </YStack>
            )}
          </ScrollView>

          {/* Footer */}
          <XStack
            paddingHorizontal={16}
            paddingVertical={12}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            backgroundColor="#FAFAFA"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize={11} color={tokens.textSecondary}>
              {queueItems.length} post{queueItems.length === 1 ? '' : 's'} queued for AVD execution
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.doneBtn}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text fontSize={12} fontWeight="800" color="#4B5563">
                Close
              </Text>
            </Pressable>
          </XStack>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    width: '100%',
    overflow: 'hidden',
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueCountBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  queueOrderBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusPill: {
    backgroundColor: '#F3E8FF',
    borderColor: '#C084FC',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  collabChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
});

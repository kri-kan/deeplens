import React, { useState, useEffect, useMemo } from 'react';
import { View, Pressable, StyleSheet, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuX,
  LuCheck,
  LuClock,
  LuShare2,
  LuBan,
  LuCamera,
  LuStar,
  LuLayers,
} from '../../icons/lu';
import { useTheme } from '@/theme';
import {
  TargetCollabAccountPicker,
  TargetCollabAccount,
} from '../../molecules/TargetCollabAccountPicker';
import type {
  PostPlannerItem,
  PostPlannerChannelOption,
  PostPlannerChannelAssignment,
} from '@/services/instagram.service';

export interface PostCurationModalProps {
  visible: boolean;
  item: PostPlannerItem | null;
  channels: PostPlannerChannelOption[];
  onClose: () => void;
  onSaveMatching: (productId: string, watchlistIds: string[], isDonePlanning: boolean) => Promise<void>;
  onRecordAction?: (
    productId: string,
    watchlistId: string,
    actionType: 'shared_now' | 'scheduled' | 'excluded',
    scheduledAt?: string,
    publishedUrl?: string,
    captionUsed?: string
  ) => Promise<void>;
}

export function PostCurationModal({
  visible,
  item,
  channels,
  onClose,
  onSaveMatching,
  onRecordAction,
}: PostCurationModalProps) {
  const { tokens } = useTheme();

  // Internal tab: 'affinities' vs 'sharing'
  const [modalTab, setModalTab] = useState<'affinities' | 'sharing'>('affinities');

  // Selected channel IDs for affinity mapping
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [savingMatching, setSavingMatching] = useState(false);

  // Sharing Tab State
  const [shareTargetChannelId, setShareTargetChannelId] = useState<string>('');
  const [shareActionType, setShareActionType] = useState<'shared_now' | 'scheduled' | 'excluded'>('scheduled');
  const [sharePreset, setSharePreset] = useState<'today_6pm' | 'tomorrow_11am' | 'tomorrow_630pm' | 'custom'>('today_6pm');
  const [sharePublishedUrl, setSharePublishedUrl] = useState('');
  const [shareCaption, setShareCaption] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Initialize selectedChannelIds whenever item opens
  useEffect(() => {
    if (item) {
      const assigned = (item.channelAssignments || [])
        .filter((a: PostPlannerChannelAssignment) => a.status !== 'excluded')
        .map((a: PostPlannerChannelAssignment) => a.watchlistId);
      setSelectedChannelIds(assigned);

      // Default shareTargetChannelId to first assigned channel or first channel
      const firstTarget = assigned[0] || (channels[0]?.watchlistId ?? '');
      setShareTargetChannelId(firstTarget);
      setShareCaption(item.title ? `${item.title} • ₹${item.price} • DM to order` : '');
      setSharePublishedUrl('');
      setModalTab('affinities');
    }
  }, [item, channels]);

  // Map PostPlannerChannelOption to TargetCollabAccount for the picker
  const collabAccounts: TargetCollabAccount[] = useMemo(() => {
    return channels.map((c) => ({
      id: c.watchlistId,
      username: c.username,
      displayName: c.displayName || c.username,
      channelType: c.channelType || 'focus',
      avatarUri: c.profilePicUrl,
    }));
  }, [channels]);

  if (!item) return null;

  const isCurated = item.planningStatus === 'complete';
  const handleToggleAccount = (accId: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
    );
  };

  const handleSave = async (isDonePlanning: boolean) => {
    try {
      setSavingMatching(true);
      await onSaveMatching(item.productId, selectedChannelIds, isDonePlanning);
      onClose();
    } catch (err) {
      console.error('Failed to save channel affinities', err);
    } finally {
      setSavingMatching(false);
    }
  };

  const computePresetDate = (preset: 'today_6pm' | 'tomorrow_11am' | 'tomorrow_630pm'): string => {
    const d = new Date();
    if (preset === 'today_6pm') {
      d.setHours(18, 0, 0, 0);
    } else if (preset === 'tomorrow_11am') {
      d.setDate(d.getDate() + 1);
      d.setHours(11, 0, 0, 0);
    } else if (preset === 'tomorrow_630pm') {
      d.setDate(d.getDate() + 1);
      d.setHours(18, 30, 0, 0);
    }
    return d.toISOString();
  };

  const handleSubmitSharingAction = async () => {
    if (!shareTargetChannelId || !onRecordAction) return;
    try {
      setSubmittingAction(true);
      const scheduledAt = shareActionType === 'scheduled' ? computePresetDate(sharePreset as any) : undefined;
      await onRecordAction(
        item.productId,
        shareTargetChannelId,
        shareActionType,
        scheduledAt,
        sharePublishedUrl.trim() || undefined,
        shareCaption.trim() || undefined
      );
      onClose();
    } catch (err) {
      console.error('Failed to record sharing action', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandleWrapper}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={16} paddingBottom={10}>
            <YStack flex={1}>
              <XStack alignItems="center" gap={6}>
                <Text fontSize={14} fontWeight="900" color="#1F2937">
                  {item.productCode || 'ITEM'}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: isCurated ? '#ECFDF5' : '#FFFBEB' },
                  ]}
                >
                  <Text
                    fontSize={10}
                    fontWeight="800"
                    color={isCurated ? '#059669' : '#D97706'}
                  >
                    {isCurated ? 'CURATED' : 'PENDING'}
                  </Text>
                </View>
              </XStack>
              <Text fontSize={12} color="#6B7280" numberOfLines={1}>
                {item.title || 'Product Curation'}
              </Text>
            </YStack>

            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <LuX size={18} color="#6B7280" />
            </Pressable>
          </XStack>

          {/* Product Quick Meta Card */}
          <View style={styles.metaRowCard}>
            {item.primaryImageUrl ? (
              <Image
                source={{ uri: item.primaryImageUrl }}
                style={styles.metaThumbnail}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.metaThumbnail, styles.metaThumbnailPlaceholder]}>
                <LuCamera size={20} color="#9CA3AF" />
              </View>
            )}

            <YStack flex={1} gap={2}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={14} fontWeight="900" color="#7E22CE">
                  ₹{Number(item.price || 0).toLocaleString('en-IN')}
                </Text>
                {(item.mediaCount ?? 0) > 0 && (
                  <View style={styles.mediaCountBadge}>
                    <LuCamera size={10} color="#4B5563" />
                    <Text fontSize={10} fontWeight="700" color="#4B5563">
                      {item.mediaCount} media
                    </Text>
                  </View>
                )}
              </XStack>
              <Text fontSize={11} color="#4B5563">
                {[item.category, item.fabric].filter(Boolean).join(' • ') || 'Indian Ethnic'}
              </Text>
              {selectedChannelIds.length > 0 && (
                <Text fontSize={10} fontWeight="700" color="#7E22CE">
                  {selectedChannelIds.length} channel(s) mapped
                </Text>
              )}
            </YStack>
          </View>

          {/* Modal Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <Pressable
              onPress={() => setModalTab('affinities')}
              style={[
                styles.tabBtn,
                modalTab === 'affinities' && styles.tabBtnActive,
              ]}
            >
              <Text
                fontSize={12}
                fontWeight="800"
                color={modalTab === 'affinities' ? '#7E22CE' : '#6B7280'}
              >
                1. Channel Affinities ({selectedChannelIds.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setModalTab('sharing')}
              style={[
                styles.tabBtn,
                modalTab === 'sharing' && styles.tabBtnActive,
              ]}
            >
              <Text
                fontSize={12}
                fontWeight="800"
                color={modalTab === 'sharing' ? '#7E22CE' : '#6B7280'}
              >
                2. Schedule & Share
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {modalTab === 'affinities' ? (
              <YStack gap={12} paddingBottom={20}>
                <Text fontSize={12} fontWeight="800" color="#374151">
                  Select Channel Affinities for Post Planning (Up to 10):
                </Text>

                <TargetCollabAccountPicker
                  accounts={collabAccounts}
                  selectedAccountIds={selectedChannelIds}
                  onToggleAccount={handleToggleAccount}
                  maxSelections={10}
                />

                <YStack gap={8} marginTop={12}>
                  <Pressable
                    onPress={() => handleSave(true)}
                    disabled={savingMatching}
                    style={[styles.primaryActionBtn, savingMatching && { opacity: 0.7 }]}
                  >
                    {savingMatching ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <XStack alignItems="center" justifyContent="center" gap={6}>
                        <LuCheck size={16} color="#FFFFFF" />
                        <Text fontSize={13} fontWeight="800" color="#FFFFFF">
                          Save & Mark Curated ({selectedChannelIds.length})
                        </Text>
                      </XStack>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleSave(false)}
                    disabled={savingMatching}
                    style={styles.secondaryActionBtn}
                  >
                    <Text fontSize={13} fontWeight="700" color="#4B5563" textAlign="center">
                      Keep In Progress ({selectedChannelIds.length})
                    </Text>
                  </Pressable>
                </YStack>
              </YStack>
            ) : (
              <YStack gap={14} paddingBottom={20}>
                {/* Target Channel Selector */}
                <YStack gap={4}>
                  <Text fontSize={12} fontWeight="800" color="#374151">
                    Select Channel to Post/Schedule:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <XStack gap={8} paddingVertical={4}>
                      {channels.map((ch) => {
                        const isSelected = ch.watchlistId === shareTargetChannelId;
                        return (
                          <Pressable
                            key={ch.watchlistId}
                            onPress={() => setShareTargetChannelId(ch.watchlistId)}
                            style={[
                              styles.channelPill,
                              isSelected && styles.channelPillActive,
                            ]}
                          >
                            <Text
                              fontSize={11}
                              fontWeight="700"
                              color={isSelected ? '#7E22CE' : '#4B5563'}
                            >
                              @{ch.username}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </XStack>
                  </ScrollView>
                </YStack>

                {/* Action Type Selector */}
                <YStack gap={6}>
                  <Text fontSize={12} fontWeight="800" color="#374151">
                    Sharing Action:
                  </Text>
                  <XStack gap={8}>
                    <Pressable
                      onPress={() => setShareActionType('scheduled')}
                      style={[
                        styles.actionTypeBtn,
                        shareActionType === 'scheduled' && styles.actionTypeBtnActive,
                      ]}
                    >
                      <LuClock size={14} color={shareActionType === 'scheduled' ? '#7E22CE' : '#6B7280'} />
                      <Text
                        fontSize={11}
                        fontWeight="700"
                        color={shareActionType === 'scheduled' ? '#7E22CE' : '#4B5563'}
                      >
                        Schedule
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setShareActionType('shared_now')}
                      style={[
                        styles.actionTypeBtn,
                        shareActionType === 'shared_now' && styles.actionTypeBtnActive,
                      ]}
                    >
                      <LuShare2 size={14} color={shareActionType === 'shared_now' ? '#7E22CE' : '#6B7280'} />
                      <Text
                        fontSize={11}
                        fontWeight="700"
                        color={shareActionType === 'shared_now' ? '#7E22CE' : '#4B5563'}
                      >
                        Shared Now
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setShareActionType('excluded')}
                      style={[
                        styles.actionTypeBtn,
                        shareActionType === 'excluded' && styles.actionTypeBtnActive,
                      ]}
                    >
                      <LuBan size={14} color={shareActionType === 'excluded' ? '#DC2626' : '#6B7280'} />
                      <Text
                        fontSize={11}
                        fontWeight="700"
                        color={shareActionType === 'excluded' ? '#DC2626' : '#4B5563'}
                      >
                        Exclude
                      </Text>
                    </Pressable>
                  </XStack>
                </YStack>

                {/* Preset Options for Scheduled */}
                {shareActionType === 'scheduled' && (
                  <YStack gap={6}>
                    <Text fontSize={12} fontWeight="800" color="#374151">
                      Quick Scheduling Presets:
                    </Text>
                    <XStack gap={6} flexWrap="wrap">
                      {[
                        { id: 'today_6pm', label: 'Today 6 PM' },
                        { id: 'tomorrow_11am', label: 'Tomorrow 11 AM' },
                        { id: 'tomorrow_630pm', label: 'Tomorrow 6:30 PM' },
                      ].map((preset) => (
                        <Pressable
                          key={preset.id}
                          onPress={() => setSharePreset(preset.id as any)}
                          style={[
                            styles.presetChip,
                            sharePreset === preset.id && styles.presetChipActive,
                          ]}
                        >
                          <Text
                            fontSize={11}
                            fontWeight="700"
                            color={sharePreset === preset.id ? '#7E22CE' : '#4B5563'}
                          >
                            {preset.label}
                          </Text>
                        </Pressable>
                      ))}
                    </XStack>
                  </YStack>
                )}

                {/* Published URL for Shared Now */}
                {shareActionType === 'shared_now' && (
                  <YStack gap={4}>
                    <Text fontSize={12} fontWeight="800" color="#374151">
                      Instagram Post URL (Optional):
                    </Text>
                    <TextInput
                      value={sharePublishedUrl}
                      onChangeText={setSharePublishedUrl}
                      placeholder="https://www.instagram.com/p/..."
                      placeholderTextColor="#9CA3AF"
                      style={styles.textInput}
                    />
                  </YStack>
                )}

                {/* Caption Input */}
                <YStack gap={4}>
                  <Text fontSize={12} fontWeight="800" color="#374151">
                    Caption:
                  </Text>
                  <TextInput
                    value={shareCaption}
                    onChangeText={setShareCaption}
                    placeholder="Enter post caption..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                  />
                </YStack>

                {/* Action Submit Button */}
                <Pressable
                  onPress={handleSubmitSharingAction}
                  disabled={submittingAction || !shareTargetChannelId}
                  style={[
                    styles.primaryActionBtn,
                    (submittingAction || !shareTargetChannelId) && { opacity: 0.6 },
                  ]}
                >
                  {submittingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text fontSize={13} fontWeight="800" color="#FFFFFF" textAlign="center">
                      Confirm {shareActionType === 'scheduled' ? 'Schedule' : shareActionType === 'shared_now' ? 'Shared Now' : 'Exclude'}
                    </Text>
                  )}
                </Pressable>
              </YStack>
            )}
          </ScrollView>
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
  sheetContainer: {
    width: '100%',
    height: '82%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  metaThumbnail: {
    width: 54,
    height: 54,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  metaThumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  primaryActionBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 11,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  channelPillActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7E22CE',
  },
  actionTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionTypeBtnActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7E22CE',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7E22CE',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1F2937',
  },
});

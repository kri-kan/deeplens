import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuX, LuCheck, LuTarget, LuPackage } from '../../icons/lu';
import { useTheme } from '@/theme';
import type { PostPlannerChannelOption } from '@/services/instagram.service';

export interface ChannelClassificationModalProps {
  visible: boolean;
  channel: PostPlannerChannelOption | null;
  onClose: () => void;
  onSaveClassification: (
    watchlistId: string,
    channelType: 'focus' | 'dump',
    categoryFocus: string[],
    targetDemography?: string
  ) => Promise<void>;
}

export function ChannelClassificationModal({
  visible,
  channel,
  onClose,
  onSaveClassification,
}: ChannelClassificationModalProps) {
  const { tokens } = useTheme();

  const [channelType, setChannelType] = useState<'focus' | 'dump'>('focus');
  const [categoryFocusText, setCategoryFocusText] = useState('');
  const [demographyText, setDemographyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (channel) {
      setChannelType(channel.channelType || 'focus');
      setCategoryFocusText((channel.categoryFocus || []).join(', '));
      setDemographyText(channel.targetDemography || '');
    }
  }, [channel]);

  if (!channel) return null;

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const tags = categoryFocusText
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      await onSaveClassification(channel.watchlistId, channelType, tags, demographyText.trim() || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to save channel classification', err);
    } finally {
      setSubmitting(false);
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
              <Text fontSize={15} fontWeight="900" color="#1F2937">
                Configure Channel
              </Text>
              <Text fontSize={12} color="#6B7280">
                @{channel.username} ({channel.displayName || 'Vayyari Channel'})
              </Text>
            </YStack>

            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <LuX size={18} color="#6B7280" />
            </Pressable>
          </XStack>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <YStack gap={14} paddingBottom={20}>
              {/* Channel Strategy Role */}
              <YStack gap={6}>
                <Text fontSize={12} fontWeight="800" color="#374151">
                  Channel Strategy Role:
                </Text>
                <XStack gap={8}>
                  <Pressable
                    onPress={() => setChannelType('focus')}
                    style={[
                      styles.roleCard,
                      channelType === 'focus' && styles.roleCardActive,
                    ]}
                  >
                    <LuTarget size={16} color={channelType === 'focus' ? '#7E22CE' : '#6B7280'} />
                    <YStack flex={1}>
                      <Text
                        fontSize={12}
                        fontWeight="800"
                        color={channelType === 'focus' ? '#7E22CE' : '#1F2937'}
                      >
                        Focus Channel
                      </Text>
                      <Text fontSize={10} color="#6B7280">
                        High engagement, niche-filtered products
                      </Text>
                    </YStack>
                  </Pressable>

                  <Pressable
                    onPress={() => setChannelType('dump')}
                    style={[
                      styles.roleCard,
                      channelType === 'dump' && styles.roleCardActive,
                    ]}
                  >
                    <LuPackage size={16} color={channelType === 'dump' ? '#7E22CE' : '#6B7280'} />
                    <YStack flex={1}>
                      <Text
                        fontSize={12}
                        fontWeight="800"
                        color={channelType === 'dump' ? '#7E22CE' : '#1F2937'}
                      >
                        Dump Channel
                      </Text>
                      <Text fontSize={10} color="#6B7280">
                        General feed, experimental / all inventory
                      </Text>
                    </YStack>
                  </Pressable>
                </XStack>
              </YStack>

              {/* Category Focus Tags */}
              <YStack gap={4}>
                <Text fontSize={12} fontWeight="800" color="#374151">
                  Category Focus (Comma separated):
                </Text>
                <TextInput
                  value={categoryFocusText}
                  onChangeText={setCategoryFocusText}
                  placeholder="e.g. Saree, Silk, Banarasi, Kanjivaram"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
                <Text fontSize={10} color="#6B7280" fontStyle="italic">
                  Used by the suggestion engine to match products for this channel.
                </Text>
              </YStack>

              {/* Target Demography */}
              <YStack gap={4}>
                <Text fontSize={12} fontWeight="800" color="#374151">
                  Target Demography:
                </Text>
                <TextInput
                  value={demographyText}
                  onChangeText={setDemographyText}
                  placeholder="e.g. South Indian Wedding & Festive Shoppers"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </YStack>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={submitting}
                style={[styles.primaryActionBtn, submitting && { opacity: 0.7 }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <XStack alignItems="center" justifyContent="center" gap={6}>
                    <LuCheck size={16} color="#FFFFFF" />
                    <Text fontSize={13} fontWeight="800" color="#FFFFFF">
                      Save Channel Settings
                    </Text>
                  </XStack>
                )}
              </Pressable>
            </YStack>
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
    maxHeight: '80%',
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
  scrollBody: {
    paddingHorizontal: 16,
  },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  roleCardActive: {
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
  primaryActionBtn: {
    backgroundColor: '#7E22CE',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});

import React from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuX,
  LuShield,
  LuSparkles,
  LuPencil,
  LuTrash2,
  LuCheck,
} from '../../icons/lu';
import { useTheme } from '@/theme';
import { StoreCurationMediaItem } from './types';

export interface MediaDualCardStackModalProps {
  visible: boolean;
  mediaItem: StoreCurationMediaItem | null;
  productCode?: string;
  onClose: () => void;
  onOpenStudio: (item: StoreCurationMediaItem) => void;
  onToggleActiveSource: (mediaId: string, source: 'original' | 'modified') => void;
  onDeleteModified: (mediaId: string) => void;
}

export function MediaDualCardStackModal({
  visible,
  mediaItem,
  productCode = 'PROD',
  onClose,
  onOpenStudio,
  onToggleActiveSource,
  onDeleteModified,
}: MediaDualCardStackModalProps) {
  const { tokens } = useTheme();

  if (!visible || !mediaItem) return null;

  const originalUrl = mediaItem.originalUri || mediaItem.uri;
  const modifiedUrl = mediaItem.modifiedUri;
  const hasModified = !!mediaItem.hasModified && !!modifiedUrl;
  const activeSource = mediaItem.activeDisplaySource || (hasModified ? 'modified' : 'original');
  const isOriginalActive = activeSource === 'original';
  const isModifiedActive = activeSource === 'modified';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: tokens.surface }]}>
          {/* Header */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={20}
            paddingVertical={16}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
            <XStack alignItems="center" gap={10}>
              <View style={[styles.headerIconCircle, { backgroundColor: `${tokens.accent}14` }]}>
                <LuShield size={18} color={tokens.accent} />
              </View>
              <YStack gap={2}>
                <Text fontSize={16} fontWeight="900" color={tokens.text}>
                  Media Version Stack
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  {productCode} • Slide #{mediaItem.sortOrder} • Anti-Lens Protection
                </Text>
              </YStack>
            </XStack>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <LuX size={20} color={tokens.textMuted} />
            </Pressable>
          </XStack>

          {/* Cards Side-by-Side Container */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text fontSize={12} color={tokens.textMuted} marginBottom={14}>
              Choose which version is presented on the public customer storefront. You can re-edit the original multiple times or delete the modified version to revert.
            </Text>

            <XStack gap={14} flexWrap="wrap" justifyContent="center">
              {/* CARD 1: ORIGINAL MASTER */}
              <View
                style={[
                  styles.versionCard,
                  {
                    borderColor: isOriginalActive ? tokens.accent : tokens.border,
                    borderWidth: isOriginalActive ? 2 : 1,
                    backgroundColor: tokens.background,
                  },
                ]}
              >
                {/* Active Indicator Top Bar */}
                <XStack
                  paddingHorizontal={12}
                  paddingVertical={8}
                  alignItems="center"
                  justifyContent="space-between"
                  borderBottomWidth={1}
                  borderBottomColor={tokens.border}
                  backgroundColor={isOriginalActive ? `${tokens.accent}14` : 'transparent'}
                >
                  <Text fontSize={11} fontWeight="800" color={isOriginalActive ? tokens.accent : tokens.textMuted}>
                    ORIGINAL MASTER
                  </Text>
                  {isOriginalActive && (
                    <View style={[styles.liveTag, { backgroundColor: tokens.accent }]}>
                      <LuCheck size={10} color="#FFFFFF" strokeWidth={3} />
                      <Text fontSize={9} fontWeight="900" color="#FFFFFF">
                        LIVE ON STORE
                      </Text>
                    </View>
                  )}
                </XStack>

                {/* Image Stage */}
                <View style={styles.cardImageStage}>
                  <Image source={{ uri: originalUrl }} style={styles.cardImg} resizeMode="contain" />
                </View>

                {/* Card Meta & Controls */}
                <YStack padding={12} gap={10}>
                  <YStack gap={2}>
                    <Text fontSize={12} fontWeight="800" color={tokens.text}>
                      Pristine High-Res Master
                    </Text>
                    <Text fontSize={10} color={tokens.textMuted}>
                      Raw supplier photo • Stored permanently in MinIO
                    </Text>
                  </YStack>

                  {/* Radio Select for Storefront */}
                  <Pressable
                    onPress={() => onToggleActiveSource(mediaItem.id, 'original')}
                    style={[
                      styles.selectRadioBtn,
                      {
                        borderColor: isOriginalActive ? tokens.accent : tokens.border,
                        backgroundColor: isOriginalActive ? `${tokens.accent}14` : tokens.surface,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isOriginalActive ? tokens.accent : tokens.textMuted },
                      ]}
                    >
                      {isOriginalActive && <View style={[styles.radioDot, { backgroundColor: tokens.accent }]} />}
                    </View>
                    <Text
                      fontSize={11}
                      fontWeight={isOriginalActive ? '800' : '600'}
                      color={isOriginalActive ? tokens.accent : tokens.text}
                    >
                      {isOriginalActive ? 'Currently Live on Store' : 'Show Original on Store'}
                    </Text>
                  </Pressable>

                  {/* Action Button: Edit in Studio */}
                  <Pressable
                    onPress={() => onOpenStudio(mediaItem)}
                    style={[styles.actionBtn, { backgroundColor: tokens.accent }]}
                  >
                    <LuPencil size={13} color="#FFFFFF" />
                    <Text fontSize={11} fontWeight="800" color="#FFFFFF">
                      {hasModified ? 'Re-Edit Original in Studio' : 'Edit in Anti-Lens Studio'}
                    </Text>
                  </Pressable>
                </YStack>
              </View>

              {/* CARD 2: MODIFIED LENS-PROOF VERSION */}
              {hasModified ? (
                <View
                  style={[
                    styles.versionCard,
                    {
                      borderColor: isModifiedActive ? '#8B5CF6' : tokens.border,
                      borderWidth: isModifiedActive ? 2 : 1,
                      backgroundColor: tokens.background,
                    },
                  ]}
                >
                  {/* Active Indicator Top Bar */}
                  <XStack
                    paddingHorizontal={12}
                    paddingVertical={8}
                    alignItems="center"
                    justifyContent="space-between"
                    borderBottomWidth={1}
                    borderBottomColor={tokens.border}
                    backgroundColor={isModifiedActive ? '#8B5CF618' : 'transparent'}
                  >
                    <XStack alignItems="center" gap={4}>
                      <LuSparkles size={12} color="#8B5CF6" />
                      <Text fontSize={11} fontWeight="800" color={isModifiedActive ? '#8B5CF6' : tokens.textMuted}>
                        LENS-PROOF MODIFIED
                      </Text>
                    </XStack>
                    {isModifiedActive && (
                      <View style={[styles.liveTag, { backgroundColor: '#8B5CF6' }]}>
                        <LuCheck size={10} color="#FFFFFF" strokeWidth={3} />
                        <Text fontSize={9} fontWeight="900" color="#FFFFFF">
                          LIVE ON STORE
                        </Text>
                      </View>
                    )}
                  </XStack>

                  {/* Image Stage */}
                  <View style={styles.cardImageStage}>
                    <Image source={{ uri: modifiedUrl! }} style={styles.cardImg} resizeMode="contain" />
                  </View>

                  {/* Card Meta & Controls */}
                  <YStack padding={12} gap={10}>
                    <YStack gap={2}>
                      <Text fontSize={12} fontWeight="800" color={tokens.text}>
                        Reverse-Search Protected
                      </Text>
                      <Text fontSize={10} color={tokens.textMuted}>
                        WebP • Flipped, tilted &amp; brand watermarked
                      </Text>
                    </YStack>

                    {/* Radio Select for Storefront */}
                    <Pressable
                      onPress={() => onToggleActiveSource(mediaItem.id, 'modified')}
                      style={[
                        styles.selectRadioBtn,
                        {
                          borderColor: isModifiedActive ? '#8B5CF6' : tokens.border,
                          backgroundColor: isModifiedActive ? '#8B5CF618' : tokens.surface,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          { borderColor: isModifiedActive ? '#8B5CF6' : tokens.textMuted },
                        ]}
                      >
                        {isModifiedActive && <View style={[styles.radioDot, { backgroundColor: '#8B5CF6' }]} />}
                      </View>
                      <Text
                        fontSize={11}
                        fontWeight={isModifiedActive ? '800' : '600'}
                        color={isModifiedActive ? '#8B5CF6' : tokens.text}
                      >
                        {isModifiedActive ? 'Currently Live on Store' : 'Show Modified on Store'}
                      </Text>
                    </Pressable>

                    {/* Action Button: Delete Modified (Revert) */}
                    <Pressable
                      onPress={() => onDeleteModified(mediaItem.id)}
                      style={[styles.dangerBtn, { borderColor: '#EF4444' }]}
                    >
                      <LuTrash2 size={13} color="#EF4444" />
                      <Text fontSize={11} fontWeight="800" color="#EF4444">
                        Delete Modified (Revert)
                      </Text>
                    </Pressable>
                  </YStack>
                </View>
              ) : (
                /* EMPTY MODIFIED PLACEHOLDER */
                <View
                  style={[
                    styles.versionCard,
                    styles.emptyCard,
                    { borderColor: tokens.border, borderStyle: 'dashed', backgroundColor: tokens.surface },
                  ]}
                >
                  <View style={[styles.emptyIconCircle, { backgroundColor: '#F3E8FF' }]}>
                    <LuSparkles size={24} color="#9333EA" />
                  </View>
                  <Text fontSize={13} fontWeight="800" color={tokens.text} textAlign="center">
                    No Modified Version Yet
                  </Text>
                  <Text fontSize={11} color={tokens.textMuted} textAlign="center" lineHeight={16}>
                    Create a Lens-Proof version with 1-tap horizontal flip, 3.5° perspective tilt, and branded watermark to protect against reverse-image searches.
                  </Text>

                  <Pressable
                    onPress={() => onOpenStudio(mediaItem)}
                    style={[styles.createCardBtn, { backgroundColor: '#9333EA' }]}
                  >
                    <LuSparkles size={14} color="#FFFFFF" />
                    <Text fontSize={12} fontWeight="900" color="#FFFFFF">
                      Create Modified Card
                    </Text>
                  </Pressable>
                </View>
              )}
            </XStack>
          </ScrollView>

          {/* Footer */}
          <XStack
            paddingHorizontal={20}
            paddingVertical={12}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            justifyContent="flex-end"
            backgroundColor={tokens.surface}
          >
            <Pressable onPress={onClose} style={styles.doneFooterBtn}>
              <Text fontSize={13} fontWeight="800" color={tokens.accent}>
                Done
              </Text>
            </Pressable>
          </XStack>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  versionCard: {
    width: 290,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyCard: {
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 380,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  cardImageStage: {
    width: '100%',
    height: 220,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  selectRadioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  doneFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

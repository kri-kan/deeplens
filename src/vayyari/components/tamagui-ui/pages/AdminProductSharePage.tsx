import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, TextInput, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuShare2,
  LuSparkles,
  LuCheck,
  LuCopy,
  LuVideo,
  LuCalendar,
  LuChevronDown,
} from '../icons/lu';
import { useTheme } from '@/theme';
import { TargetChannelOption, TargetChannelAvatar } from '../molecules/TargetChannelAvatar';
import {
  MaterialDateTimePicker,
  DayPartSlot,
  formatMaterialScheduleDateTime,
} from '../molecules/MaterialDateTimePicker';

export type PostSharePlatform = 'others' | 'instagram';

export interface ProductShareMediaItem {
  id: string;
  uri: string;
  mediaType?: 'image' | 'video';
  isPrimary?: boolean;
}

export interface ProductVendorSource {
  id: string;
  vendorName: string;
  description: string;
}

export interface PostShareAttributionPayload {
  platform: PostSharePlatform;
  channelId?: string;
  channel?: TargetChannelOption | null;
  scheduledDatePreset?: string;
  customDate?: string;
  customSlot?: DayPartSlot;
  customTime?: string;
  formattedScheduleLabel?: string;
  selectedMediaIds: string[];
  caption: string;
}

export interface AdminProductSharePageProps {
  mode?: 'catalog' | 'post_planner';
  productCode?: string;
  productTitle?: string;
  category?: string;
  fabric?: string;
  price?: number;
  media?: ProductShareMediaItem[];
  vendorSources?: ProductVendorSource[];
  channels?: TargetChannelOption[];
  lockedChannel?: TargetChannelOption;
  initialDescription?: string;
  postShareSheetOpen?: boolean;
  calendarModalOpen?: boolean;
  initialAttributionPlatform?: PostSharePlatform;
  initialSelectedChannelId?: string;
  initialDatePreset?: string;
  initialCustomDate?: string;
  initialCustomSlot?: DayPartSlot;
  onBack?: () => void;
  onShareFiles?: (selectedMediaIds: string[], caption: string) => void;
  onConfirmAttribution?: (payload: PostShareAttributionPayload) => void;
  onDismissAttribution?: () => void;
  disableSafeArea?: boolean;
}

export const DEFAULT_CHANNELS: TargetChannelOption[] = [
  { id: 'ch-1', username: 'vayyari_fashions', displayName: 'Vayyari Fashions (Main)', channelType: 'focus', isDefault: true },
  { id: 'ch-2', username: 'saree_dump', displayName: 'Saree Dump Channel', channelType: 'dump' },
  { id: 'ch-3', username: 'dressbyvayyari', displayName: 'Dress by Vayyari', channelType: 'dump' },
  { id: 'ch-4', username: 'fusion_edits_dump', displayName: 'Fusion Edits Dump', channelType: 'dump' },
];

export function AdminProductSharePage({
  mode = 'catalog',
  productCode = 'SAR-KAN-901',
  productTitle = 'Kanjivaram Pure Silk Saree',
  category = 'Saree',
  fabric = 'Mulberry Silk',
  price = 10999,
  media = [],
  vendorSources = [],
  channels = DEFAULT_CHANNELS,
  lockedChannel,
  initialDescription = '',
  postShareSheetOpen = false,
  calendarModalOpen = false,
  initialAttributionPlatform = 'others',
  initialSelectedChannelId,
  initialDatePreset = 'Tomorrow 11:00 AM',
  initialCustomDate = '2026-09-18',
  initialCustomSlot = 'evening',
  onBack,
  onShareFiles,
  onConfirmAttribution,
  onDismissAttribution,
  disableSafeArea = false,
}: AdminProductSharePageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>(media.map((m) => m.id));
  const [caption, setCaption] = useState(initialDescription);
  const [isSheetVisible, setIsSheetVisible] = useState(postShareSheetOpen);
  const [attributionPlatform, setAttributionPlatform] = useState<PostSharePlatform>(initialAttributionPlatform);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    initialSelectedChannelId || (lockedChannel ? lockedChannel.id : channels[0]?.id || 'ch-1')
  );

  const [selectedCustomDate, setSelectedCustomDate] = useState<string>(initialCustomDate);
  const [selectedCustomSlot, setSelectedCustomSlot] = useState<DayPartSlot>(initialCustomSlot);
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(calendarModalOpen);
  const [isCopiedToast, setIsCopiedToast] = useState(false);

  const toggleMediaSelect = (id: string) => {
    if (selectedMediaIds.includes(id)) {
      setSelectedMediaIds(selectedMediaIds.filter((item) => item !== id));
    } else {
      setSelectedMediaIds([...selectedMediaIds, id]);
    }
  };

  const selectAllMedia = () => {
    if (selectedMediaIds.length === media.length) {
      setSelectedMediaIds([]);
    } else {
      setSelectedMediaIds(media.map((m) => m.id));
    }
  };

  const handleGenerateAICaption = () => {
    const aiText = `✨ ${productTitle} (${productCode})\n\n🌟 Pure authentic ${fabric} with rich golden zari borders.\n🏷️ Category: ${category}\n💰 Price: ₹${price.toLocaleString('en-IN')}\n\n📦 Free Shipping Across India · COD Available\n📲 DM / WhatsApp to order! #vayyarifashions #handloomsaree #${category.toLowerCase()}`;
    setCaption(aiText);
  };

  const handleAppendVendorText = (text: string) => {
    setCaption((prev) => (prev ? `${prev}\n\n${text}` : text));
  };

  const handleTriggerShare = () => {
    if (selectedMediaIds.length === 0) return;
    onShareFiles?.(selectedMediaIds, caption);
    setIsSheetVisible(true);
  };

  const handleConfirmAttribution = () => {
    const activeChannel = channels.find((c) => c.id === selectedChannelId) || null;
    const formattedDate = formatMaterialScheduleDateTime(selectedCustomDate, selectedCustomSlot);

    onConfirmAttribution?.({
      platform: attributionPlatform,
      channelId: selectedChannelId,
      channel: activeChannel,
      customDate: selectedCustomDate,
      customSlot: selectedCustomSlot,
      formattedScheduleLabel: formattedDate,
      selectedMediaIds,
      caption,
    });
    setIsSheetVisible(false);
  };

  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={480}
      alignSelf="center"
      backgroundColor={tokens.background}
      position="relative"
      overflow="hidden"
    >
      {/* ── TOP NAV BAR ── */}
      <XStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal={12}
        paddingTop={topInset + 8}
        paddingBottom={10}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={8}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack>
            <XStack alignItems="center" gap={5}>
              <LuShare2 size={15} color={tokens.accent} />
              <Text fontSize={15} fontWeight="800" color={tokens.text}>
                Share & Publish
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              {productCode} · {category}
            </Text>
          </YStack>
        </XStack>

        <Pressable onPress={selectAllMedia} hitSlop={6}>
          <Text fontSize={11} fontWeight="800" color={tokens.accent}>
            {selectedMediaIds.length === media.length ? 'Deselect All' : `Select All (${media.length})`}
          </Text>
        </Pressable>
      </XStack>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ── 1. 3-COLUMN MEDIA GRID ── */}
        <YStack padding={12} gap={8}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
              Select Photos & Videos ({selectedMediaIds.length}/{media.length})
            </Text>
          </XStack>

          <View style={styles.mediaGrid}>
            {media.map((item) => {
              const selectedIndex = selectedMediaIds.indexOf(item.id);
              const isSelected = selectedIndex !== -1;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleMediaSelect(item.id)}
                  style={[
                    styles.mediaTile,
                    {
                      borderColor: isSelected ? tokens.accent : tokens.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Image source={{ uri: item.uri }} style={styles.tileImage} resizeMode="cover" />

                  {/* Numbered Order Badge (1..N) */}
                  <View
                    style={[
                      styles.orderBadge,
                      {
                        backgroundColor: isSelected ? tokens.accent : 'rgba(0,0,0,0.5)',
                        borderColor: isSelected ? tokens.accent : '#fff',
                      },
                    ]}
                  >
                    <Text fontSize={10} fontWeight="900" color={isSelected ? tokens.accentForeground : '#fff'}>
                      {isSelected ? selectedIndex + 1 : ''}
                    </Text>
                  </View>

                  {/* Video Badge */}
                  {item.mediaType === 'video' && (
                    <View style={styles.videoBadge}>
                      <LuVideo size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </YStack>

        {/* ── 2. AI CAPTION GENERATOR ── */}
        <YStack paddingHorizontal={12} gap={8}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
              Caption & Hashtags
            </Text>

            <Pressable
              onPress={handleGenerateAICaption}
              style={({ pressed }) => [
                styles.aiPillBtn,
                { backgroundColor: pressed ? tokens.accentSubtle : `${tokens.accent}15` },
              ]}
            >
              <XStack alignItems="center" gap={4}>
                <LuSparkles size={12} color={tokens.accent} />
                <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                  AI Caption
                </Text>
              </XStack>
            </Pressable>
          </XStack>

          <TextInput
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={5}
            placeholder="Write caption or tap AI Caption to auto-generate..."
            placeholderTextColor={tokens.textMuted}
            style={[styles.captionInput, { borderColor: tokens.border }]}
          />

          {/* Quick Vendor Append Chips */}
          {vendorSources.length > 0 && (
            <YStack gap={4}>
              <Text fontSize={10} color={tokens.textMuted}>
                Tap to append vendor notes:
              </Text>
              <XStack flexWrap="wrap" gap={6}>
                {vendorSources.map((v) => (
                  <Pressable
                    key={v.id}
                    onPress={() => handleAppendVendorText(v.description)}
                    style={styles.vendorChip}
                  >
                    <Text fontSize={10} fontWeight="700" color={tokens.text}>
                      🏬 {v.vendorName}
                    </Text>
                  </Pressable>
                ))}
              </XStack>
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* ── STICKY BOTTOM SHARE ACTION BAR ── */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={14}
        paddingTop={10}
        paddingBottom={bottomInset + 12}
      >
        <Pressable
          onPress={handleTriggerShare}
          disabled={selectedMediaIds.length === 0}
          style={({ pressed }) => [
            styles.shareBtn,
            { backgroundColor: selectedMediaIds.length === 0 ? tokens.border : tokens.accent, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <XStack alignItems="center" justifyContent="center" gap={8}>
            <LuShare2 size={16} color={tokens.accentForeground} />
            <Text fontSize={14} fontWeight="800" color={tokens.accentForeground}>
              Share Files ({selectedMediaIds.length})
            </Text>
          </XStack>
        </Pressable>
      </YStack>

      {/* ── POST-SHARE ATTRIBUTION BOTTOM SHEET ── */}
      {isSheetVisible && (
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setIsSheetVisible(false)} />

          <YStack
            backgroundColor={tokens.surface}
            borderTopLeftRadius={16}
            borderTopRightRadius={16}
            padding={16}
            gap={14}
            maxHeight="80%"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={14} fontWeight="900" color={tokens.text}>
                Record Post-Share Attribution
              </Text>
              <Pressable onPress={() => setIsSheetVisible(false)}>
                <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
                  Dismiss
                </Text>
              </Pressable>
            </XStack>

            {/* Platform Selector */}
            <XStack backgroundColor="rgba(0,0,0,0.04)" borderRadius={8} padding={3} gap={4}>
              <Pressable
                onPress={() => setAttributionPlatform('others')}
                style={[
                  styles.platformTab,
                  { backgroundColor: attributionPlatform === 'others' ? tokens.surface : 'transparent' },
                ]}
              >
                <Text fontSize={11} fontWeight="800" color={attributionPlatform === 'others' ? tokens.accent : tokens.textMuted}>
                  Others (WhatsApp)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAttributionPlatform('instagram')}
                style={[
                  styles.platformTab,
                  { backgroundColor: attributionPlatform === 'instagram' ? tokens.surface : 'transparent' },
                ]}
              >
                <Text fontSize={11} fontWeight="800" color={attributionPlatform === 'instagram' ? tokens.accent : tokens.textMuted}>
                  Instagram Account
                </Text>
              </Pressable>
            </XStack>

            {attributionPlatform === 'instagram' && (
              <YStack gap={10}>
                <Text fontSize={11} color={tokens.textMuted}>
                  Select Destination Instagram Profile:
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {channels.map((ch) => (
                    <TargetChannelAvatar
                      key={ch.id}
                      channel={ch}
                      isSelected={selectedChannelId === ch.id}
                      onPress={(id) => setSelectedChannelId(id)}
                    />
                  ))}
                </ScrollView>

                {/* Date-Time Schedule Trigger */}
                <YStack gap={4}>
                  <Text fontSize={11} color={tokens.textMuted}>
                    Schedule Time:
                  </Text>
                  <Pressable
                    onPress={() => setIsCalendarModalVisible(true)}
                    style={styles.scheduleTrigger}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <XStack alignItems="center" gap={6}>
                        <LuCalendar size={14} color={tokens.accent} />
                        <Text fontSize={11} fontWeight="700" color={tokens.text}>
                          {formatMaterialScheduleDateTime(selectedCustomDate, selectedCustomSlot)}
                        </Text>
                      </XStack>
                      <LuChevronDown size={14} color={tokens.textMuted} />
                    </XStack>
                  </Pressable>
                </YStack>
              </YStack>
            )}

            {/* Confirm Attribution CTA */}
            <Pressable
              onPress={handleConfirmAttribution}
              style={[styles.confirmBtn, { backgroundColor: tokens.accent }]}
            >
              <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} textAlign="center">
                Confirm & Record Attribution
              </Text>
            </Pressable>
          </YStack>
        </View>
      )}

      {/* ── MATERIAL 3 CALENDAR MODAL OVERLAY ── */}
      {isCalendarModalVisible && (
        <View style={styles.calendarModalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setIsCalendarModalVisible(false)} />
          <View style={{ width: '92%', maxWidth: 380, zIndex: 100 }}>
            <MaterialDateTimePicker
              selectedDate={selectedCustomDate}
              selectedDayPart={selectedCustomSlot}
              onDateChange={(d) => setSelectedCustomDate(d)}
              onDayPartChange={(slot) => setSelectedCustomSlot(slot)}
              onConfirm={(d, slot) => {
                setSelectedCustomDate(d);
                setSelectedCustomSlot(slot);
                setIsCalendarModalVisible(false);
              }}
              onCancel={() => setIsCalendarModalVisible(false)}
            />
          </View>
        </View>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mediaTile: {
    width: '31.8%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#222',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  orderBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#000',
    padding: 3,
    borderRadius: 3,
  },
  aiPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  captionInput: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  vendorChip: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  shareBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    zIndex: 90,
  },
  calendarModalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 95,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  platformTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  scheduleTrigger: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  confirmBtn: {
    paddingVertical: 10,
    borderRadius: 8,
  },
});

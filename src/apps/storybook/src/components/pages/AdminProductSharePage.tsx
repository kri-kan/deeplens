import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, TextInput, Dimensions, Platform, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuShare2,
  LuInstagram,
  LuSparkles,
  LuCheck,
  LuStore,
  LuCopy,
  LuVideo,
  LuCalendar,
  LuChevronDown,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
import { TargetChannelOption } from '../molecules/post-planner.types';
import { TargetChannelAvatar } from '../molecules/TargetChannelAvatar';
import {
  MaterialDateTimePicker,
  DayPartSlot,
  formatMaterialScheduleDateTime,
} from '../molecules/MaterialDateTimePicker';
import { BottomSheet } from '../atoms/BottomSheet';
import { DEFAULT_CHANNELS } from './AdminPostPlannerPage';

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
}

export const MOCK_SHARE_MEDIA: ProductShareMediaItem[] = [
  {
    id: 'm-1',
    uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    mediaType: 'image',
    isPrimary: true,
  },
  {
    id: 'm-2',
    uri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-3',
    uri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-4',
    uri: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-5',
    uri: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-6',
    uri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-7',
    uri: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-8',
    uri: 'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-9',
    uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    mediaType: 'video',
  },
  {
    id: 'm-10',
    uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-11',
    uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    mediaType: 'image',
  },
  {
    id: 'm-12',
    uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80',
    mediaType: 'image',
  },
];

export const MOCK_VENDOR_SOURCES: ProductVendorSource[] = [
  {
    id: 'v-1',
    vendorName: 'Krishna Fashions',
    description: 'Exclusive Mulberry Silk Handloom Saree with floral threadwork and contrast pallu. Code: SAR-KAN-901. Price: ₹8,499. DM to order.',
  },
  {
    id: 'v-2',
    vendorName: 'Surat Silk Mills',
    description: 'Pure Zari border tissue saree with designer blouse piece. Ready to ship pan India.',
  },
];

export function AdminProductSharePage({
  mode = 'catalog',
  productCode = 'SAR-KAN-901',
  productTitle = 'Kanjivaram Silk Saree',
  category = 'Saree',
  fabric = 'Mulberry Silk',
  price = 8499,
  media = MOCK_SHARE_MEDIA,
  vendorSources = MOCK_VENDOR_SOURCES,
  channels = DEFAULT_CHANNELS,
  lockedChannel,
  initialDescription = '',
  postShareSheetOpen: controlledPostShareOpen,
  calendarModalOpen: controlledCalendarOpen,
  initialAttributionPlatform = 'others',
  initialSelectedChannelId,
  initialDatePreset = 'today',
  initialCustomDate = '2026-09-15',
  initialCustomSlot = 'evening',
  onBack,
  onShareFiles,
  onConfirmAttribution,
  onDismissAttribution,
}: AdminProductSharePageProps) {
  const { tokens } = useTheme();

  // Media selection (maintains ordered list of selected IDs for 1..N badges)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => media.map((m) => m.id));

  // Caption / Description state
  const [caption, setCaption] = useState(initialDescription);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Post-Share Attribution Sheet State
  const [internalPostShareOpen, setInternalPostShareOpen] = useState(false);
  const isPostShareOpen =
    controlledPostShareOpen !== undefined ? controlledPostShareOpen : internalPostShareOpen;

  // Calendar / Day-Part Popover State
  const [internalCalendarOpen, setInternalCalendarOpen] = useState(false);
  const isCalendarModalOpen =
    controlledCalendarOpen !== undefined ? controlledCalendarOpen : internalCalendarOpen;

  // Attribution fields
  const [attributionPlatform, setAttributionPlatform] = useState<PostSharePlatform>(initialAttributionPlatform);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    initialSelectedChannelId || (lockedChannel ? lockedChannel.id : channels[0]?.id || '')
  );
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>(initialDatePreset);
  const [customDate, setCustomDate] = useState<string>(initialCustomDate);
  const [customSlot, setCustomSlot] = useState<DayPartSlot>(initialCustomSlot);

  // Toggle single media
  const toggleMedia = (id: string) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Toggle all
  const allSelected = selectedIds.length === media.length && media.length > 0;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(media.map((m) => m.id));
    }
  };

  // AI Caption generation simulation
  const handleGenerateAiCaption = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      const generated = `✨ ${productTitle} (${productCode})\n\n🌟 Fabric: ${fabric}\n🏷️ Price: ₹${price.toLocaleString('en-IN')}\n\nElevate your festive wardrobe with our exquisite handcrafted ${category.toLowerCase()}. Designed for timeless grace and unparalleled comfort.\n\n🛒 DM us or WhatsApp to place your order!\n\n#VayyariFashions #EthnicWear #IndianFashion #HandloomSaree #${category} #FestiveCollection`;
      setCaption(generated);
      setIsGeneratingAi(false);
    }, 500);
  };

  // Append vendor description
  const appendVendorText = (desc: string) => {
    setCaption((prev) => (prev ? `${prev}\n\n${desc}` : desc));
  };

  // Copy caption
  const handleCopyCaption = () => {
    if (caption && Platform.OS === 'web') {
      navigator.clipboard?.writeText(caption);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  // Tap "Share Files" in main screen
  const handleInitiateShare = () => {
    onShareFiles?.(selectedIds, caption);
    // Simulate return from native share to open attribution sheet
    setInternalPostShareOpen(true);
  };

  // Confirm attribution in bottom sheet
  const handleConfirmAttribution = () => {
    const activeChannel =
      attributionPlatform === 'instagram'
        ? channels.find((c) => c.id === selectedChannelId) || lockedChannel || null
        : null;

    const formattedLabel =
      selectedDatePreset === 'custom'
        ? formatMaterialScheduleDateTime(customDate, customSlot)
        : 'Today (Just Now)';

    onConfirmAttribution?.({
      platform: attributionPlatform,
      channelId: selectedChannelId,
      channel: activeChannel,
      scheduledDatePreset: selectedDatePreset,
      customDate: selectedDatePreset === 'custom' ? customDate : undefined,
      customSlot: selectedDatePreset === 'custom' ? customSlot : undefined,
      formattedScheduleLabel: formattedLabel,
      selectedMediaIds: selectedIds,
      caption,
    });
    setInternalPostShareOpen(false);
  };

  const handleDismissAttribution = () => {
    onDismissAttribution?.();
    setInternalPostShareOpen(false);
  };

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
      <XStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal={12}
        paddingVertical={10}
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
            <Text fontSize={16} fontWeight="800" color={tokens.text}>
              Share & Publish
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              {productCode} · {productTitle}
            </Text>
          </YStack>
        </XStack>

        {/* Selected media counter badge */}
        <XStack
          backgroundColor={selectedIds.length > 0 ? tokens.accentSubtle : tokens.surfaceRaised}
          paddingHorizontal={8}
          paddingVertical={4}
          borderRadius={12}
          borderWidth={1}
          borderColor={selectedIds.length > 0 ? `${tokens.accent}60` : tokens.border}
        >
          <Text
            fontSize={11}
            fontWeight="800"
            color={selectedIds.length > 0 ? tokens.accent : tokens.textMuted}
          >
            {selectedIds.length} of {media.length} selected
          </Text>
        </XStack>
      </XStack>

      {/* ── MAIN SCROLLABLE BODY ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        <YStack gap={14} padding={12}>
          {/* Post Planner Mode: Locked Channel Context Card (if in post planner) */}
          {mode === 'post_planner' && lockedChannel && (
            <YStack
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={`${tokens.accent}60`}
              padding={10}
              gap={6}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={11} fontWeight="800" color={tokens.accent} textTransform="uppercase" letterSpacing={0.6}>
                  Post Planner Channel Context
                </Text>
                <View
                  style={{
                    backgroundColor: tokens.accentSubtle,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                    Locked
                  </Text>
                </View>
              </XStack>

              <XStack alignItems="center" gap={10}>
                {lockedChannel.avatarUri ? (
                  <Image source={{ uri: lockedChannel.avatarUri }} style={styles.accountAvatar} resizeMode="cover" />
                ) : (
                  <View
                    style={[
                      styles.accountAvatar,
                      { backgroundColor: tokens.accentSubtle, alignItems: 'center', justifyContent: 'center' },
                    ]}
                  >
                    <LuInstagram size={18} color={tokens.accent} />
                  </View>
                )}
                <YStack flex={1}>
                  <Text fontSize={13} fontWeight="800" color={tokens.text}>
                    @{lockedChannel.username}
                  </Text>
                  <Text fontSize={11} color={tokens.textSecondary}>
                    {lockedChannel.niche || 'Instagram Publishing Queue'}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          )}

          {/* ── 1. MEDIA SELECTION GRID (3 COLUMNS) ── */}
          <YStack gap={8}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={13} fontWeight="800" color={tokens.text}>
                Select Media to Share
              </Text>
              <Pressable onPress={toggleSelectAll} hitSlop={6}>
                <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
            </XStack>

            {/* 3-Column Grid */}
            <XStack flexWrap="wrap" marginHorizontal={-3}>
              {media.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const orderIndex = selectedIds.indexOf(item.id) + 1;

                return (
                  <View key={item.id} style={styles.gridItemContainer}>
                    <Pressable
                      onPress={() => toggleMedia(item.id)}
                      style={[
                        styles.gridTile,
                        {
                          borderColor: isSelected ? tokens.accent : tokens.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.tileImage}
                        resizeMode="cover"
                      />

                      {/* Video indicator badge */}
                      {item.mediaType === 'video' && (
                        <View style={styles.videoBadge}>
                          <LuVideo size={10} color="#fff" />
                          <Text fontSize={9} fontWeight="800" color="#fff">
                            VIDEO
                          </Text>
                        </View>
                      )}

                      {/* Numbered selection badge */}
                      {isSelected ? (
                        <View
                          style={[
                            styles.numberBadge,
                            { backgroundColor: tokens.accent },
                          ]}
                        >
                          <Text
                            fontSize={11}
                            fontWeight="800"
                            color={tokens.accentForeground}
                          >
                            {orderIndex}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.unselectedRing} />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </XStack>
          </YStack>

          {/* ── 2. CAPTION & AI DESCRIPTION SECTION ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding={12}
            gap={10}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={13} fontWeight="800" color={tokens.text}>
                Caption & Description
              </Text>

              {/* Compact AI Generate Button */}
              <Pressable
                onPress={handleGenerateAiCaption}
                disabled={isGeneratingAi}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.aiButton,
                  {
                    backgroundColor: pressed ? `${tokens.accent}20` : `${tokens.accent}0E`,
                    borderColor: `${tokens.accent}60`,
                  },
                ]}
              >
                <XStack alignItems="center" gap={4}>
                  <LuSparkles size={12} color={tokens.accent} />
                  <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                    {isGeneratingAi ? 'Generating...' : '✨ AI Caption'}
                  </Text>
                </XStack>
              </Pressable>
            </XStack>

            {/* Vendor description quick-chips */}
            {vendorSources.length > 0 && (
              <YStack gap={6}>
                <Text fontSize={11} color={tokens.textMuted}>
                  Tap vendor source to append details:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <XStack gap={6}>
                    {vendorSources.map((v) => (
                      <Pressable
                        key={v.id}
                        onPress={() => appendVendorText(v.description)}
                        style={({ pressed }) => [
                          styles.vendorChip,
                          {
                            backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
                            borderColor: tokens.border,
                          },
                        ]}
                      >
                        <XStack alignItems="center" gap={4}>
                          <LuStore size={12} color={tokens.accent} />
                          <Text fontSize={11} fontWeight="700" color={tokens.text}>
                            {v.vendorName}
                          </Text>
                        </XStack>
                      </Pressable>
                    ))}
                  </XStack>
                </ScrollView>
              </YStack>
            )}

            {/* Multi-line Caption Box */}
            <YStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              padding={10}
              gap={6}
            >
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Enter or generate a post caption, hashtags, and pricing..."
                placeholderTextColor={tokens.textMuted}
                multiline
                numberOfLines={5}
                style={styles.captionInput}
              />
              <XStack alignItems="center" justifyContent="space-between" paddingTop={4}>
                <Text fontSize={10} color={tokens.textMuted}>
                  {caption.length} characters
                </Text>
                {caption ? (
                  <Pressable onPress={handleCopyCaption} hitSlop={6}>
                    <XStack alignItems="center" gap={4}>
                      <LuCopy size={11} color={tokens.accent} />
                      <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                        {copiedNotification ? 'Copied!' : 'Copy'}
                      </Text>
                    </XStack>
                  </Pressable>
                ) : null}
              </XStack>
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>

      {/* ── STICKY BOTTOM ACTION FOOTER ── */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={12}
        paddingTop={10}
        paddingBottom={Platform.OS === 'ios' ? 24 : 12}
      >
        <Pressable
          onPress={handleInitiateShare}
          disabled={selectedIds.length === 0}
          style={({ pressed }) => [
            styles.publishBtn,
            {
              backgroundColor: selectedIds.length > 0 ? tokens.accent : tokens.border,
              opacity: pressed ? 0.9 : selectedIds.length > 0 ? 1 : 0.5,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Share ${selectedIds.length} files`}
        >
          <XStack alignItems="center" justifyContent="center" gap={8}>
            <LuShare2 size={17} color={tokens.accentForeground} />
            <Text
              fontSize={14}
              fontWeight="800"
              color={selectedIds.length > 0 ? tokens.accentForeground : tokens.textMuted}
            >
              Share Files ({selectedIds.length})
            </Text>
          </XStack>
        </Pressable>
      </YStack>

      {/* ── COMPACT POST-SHARE ATTRIBUTION BOTTOM SHEET ── */}
      <BottomSheet
        visible={isPostShareOpen}
        onClose={handleDismissAttribution}
        title="Where was this shared?"
        zIndex={999}
        footer={
          <XStack gap={10} paddingTop={6}>
            <Pressable
              onPress={handleDismissAttribution}
              style={({ pressed }) => [
                styles.sheetBtn,
                {
                  flex: 1,
                  backgroundColor: pressed ? tokens.surfaceRaised : tokens.surface,
                  borderColor: tokens.border,
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text fontSize={13} fontWeight="800" color={tokens.text} textAlign="center">
                Dismiss
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmAttribution}
              style={({ pressed }) => [
                styles.sheetBtn,
                {
                  flex: 1.5,
                  backgroundColor: tokens.accent,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <XStack alignItems="center" justifyContent="center" gap={6}>
                <LuCheck size={16} color={tokens.accentForeground} />
                <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} textAlign="center">
                  Done & Confirm
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        }
      >
        <YStack gap={12} paddingHorizontal={2} paddingBottom={4}>
          {/* 1. Compact Destination Toggle: Others vs Instagram */}
          <XStack gap={8}>
            {/* Others (Default) */}
            <Pressable
              onPress={() => setAttributionPlatform('others')}
              style={[
                styles.compactPlatformTab,
                {
                  backgroundColor: attributionPlatform === 'others' ? tokens.accent : tokens.surfaceRaised,
                  borderColor: attributionPlatform === 'others' ? tokens.accent : tokens.border,
                },
              ]}
            >
              <XStack alignItems="center" gap={5}>
                <LuShare2
                  size={13}
                  color={attributionPlatform === 'others' ? tokens.accentForeground : tokens.textSecondary}
                />
                <Text
                  fontSize={12}
                  fontWeight="800"
                  color={attributionPlatform === 'others' ? tokens.accentForeground : tokens.textSecondary}
                >
                  Others
                </Text>
              </XStack>
            </Pressable>

            {/* Instagram */}
            <Pressable
              onPress={() => setAttributionPlatform('instagram')}
              style={[
                styles.compactPlatformTab,
                {
                  backgroundColor: attributionPlatform === 'instagram' ? tokens.accent : tokens.surfaceRaised,
                  borderColor: attributionPlatform === 'instagram' ? tokens.accent : tokens.border,
                },
              ]}
            >
              <XStack alignItems="center" gap={5}>
                <LuInstagram
                  size={13}
                  color={attributionPlatform === 'instagram' ? tokens.accentForeground : tokens.textSecondary}
                />
                <Text
                  fontSize={12}
                  fontWeight="800"
                  color={attributionPlatform === 'instagram' ? tokens.accentForeground : tokens.textSecondary}
                >
                  Instagram
                </Text>
              </XStack>
            </Pressable>
          </XStack>

          {/* 2. When Instagram is selected */}
          {attributionPlatform === 'instagram' && (
            <YStack gap={10}>
              {/* Instagram Account Swipeable Row */}
              <YStack gap={6}>
                <Text fontSize={12} fontWeight="800" color={tokens.text}>
                  Select Instagram Account:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2 }}>
                  <XStack gap={10} alignItems="center">
                    {channels.map((channel) => (
                      <TargetChannelAvatar
                        key={channel.id}
                        channel={channel}
                        isSelected={selectedChannelId === channel.id}
                        onPress={(id) => setSelectedChannelId(id)}
                        size="md"
                        showBadge={true}
                        showTypePill={true}
                      />
                    ))}
                  </XStack>
                </ScrollView>
              </YStack>

              {/* Schedule Date & Time Trigger Input with Popover / Overlay Picker */}
              <YStack gap={6}>
                <Text fontSize={12} fontWeight="800" color={tokens.text}>
                  Post / Schedule Date & Time:
                </Text>

                <Pressable
                  onPress={() => setInternalCalendarOpen(true)}
                  style={({ pressed }) => [
                    styles.dateTimeTrigger,
                    {
                      backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
                      borderColor: tokens.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Open calendar and day-part time picker"
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={8} flex={1}>
                      <LuCalendar size={15} color={tokens.accent} />
                      <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                        {selectedDatePreset === 'today'
                          ? 'Today (Just Now)'
                          : formatMaterialScheduleDateTime(customDate, customSlot)}
                      </Text>
                    </XStack>
                    <XStack alignItems="center" gap={4}>
                      <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                        Change
                      </Text>
                      <LuChevronDown size={14} color={tokens.accent} />
                    </XStack>
                  </XStack>
                </Pressable>
              </YStack>
            </YStack>
          )}
        </YStack>
      </BottomSheet>

      {/* ── ANDROID MATERIAL 3 STYLE DATE & TIME PICKER MODAL ── */}
      <BottomSheet
        visible={isCalendarModalOpen}
        onClose={() => setInternalCalendarOpen(false)}
        title="Schedule Date & Timing"
        zIndex={1001}
      >
        <YStack gap={10} paddingBottom={6}>
          {/* Quick preset chips */}
          <XStack gap={6}>
            <Pressable
              onPress={() => {
                setSelectedDatePreset('today');
                setInternalCalendarOpen(false);
              }}
              style={[
                styles.datePresetChip,
                {
                  flex: 1,
                  backgroundColor: selectedDatePreset === 'today' ? tokens.accent : tokens.surfaceRaised,
                  borderColor: selectedDatePreset === 'today' ? tokens.accent : tokens.border,
                },
              ]}
            >
              <Text
                fontSize={11}
                fontWeight="700"
                color={selectedDatePreset === 'today' ? tokens.accentForeground : tokens.text}
                textAlign="center"
              >
                ⚡ Today (Just Now)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSelectedDatePreset('custom');
              }}
              style={[
                styles.datePresetChip,
                {
                  flex: 1,
                  backgroundColor: selectedDatePreset === 'custom' ? tokens.accent : tokens.surfaceRaised,
                  borderColor: selectedDatePreset === 'custom' ? tokens.accent : tokens.border,
                },
              ]}
            >
              <Text
                fontSize={11}
                fontWeight="700"
                color={selectedDatePreset === 'custom' ? tokens.accentForeground : tokens.text}
                textAlign="center"
              >
                📅 Custom Calendar & Time
              </Text>
            </Pressable>
          </XStack>

          {/* Android Material 3 Style Calendar & Time Picker */}
          <MaterialDateTimePicker
            selectedDate={customDate}
            selectedDayPart={customSlot}
            onDateChange={(d) => {
              setCustomDate(d);
              setSelectedDatePreset('custom');
            }}
            onDayPartChange={(slot) => {
              setCustomSlot(slot);
              setSelectedDatePreset('custom');
            }}
            onConfirm={(d, slot) => {
              setCustomDate(d);
              setCustomSlot(slot);
              setSelectedDatePreset('custom');
              setInternalCalendarOpen(false);
            }}
            onCancel={() => setInternalCalendarOpen(false)}
            showActionBar={true}
          />
        </YStack>
      </BottomSheet>
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
  accountAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  gridItemContainer: {
    width: '33.333%',
    padding: 3,
  },
  gridTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  numberBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  unselectedRing: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  aiButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  vendorChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  captionInput: {
    fontSize: 13,
    minHeight: 80,
    outlineStyle: 'none',
    textAlignVertical: 'top',
  } as any,
  publishBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtn: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPlatformTab: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeTrigger: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  datePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { YStack, XStack, Text } from 'tamagui';
import { LuStar, LuCheck, LuPencil } from '../../icons/lu';
import { useTheme } from '@/theme';

export interface ProductGridTileData {
  id: string;
  productCode?: string;
  title?: string;
  price?: number;
  category?: string;
  imageUri?: string;
  isStarred?: boolean;
  listingCount?: number;
  timeAgo?: string;
  rawItem?: any;
}

export interface ProductGridTileProps {
  item: ProductGridTileData;
  selected?: boolean;
  selectionMode?: boolean;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onQuickEdit?: (item: ProductGridTileData) => void;
}

export function ProductGridTile({
  item,
  selected = false,
  selectionMode = false,
  onPress,
  onLongPress,
  onToggleStar,
  onQuickEdit,
}: ProductGridTileProps) {
  const { tokens } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Product ${item.productCode || item.id}`}
      activeOpacity={0.8}
      onPress={() => onPress?.(item.id)}
      onLongPress={() => onLongPress?.(item.id)}
      style={{ width: '100%' }}
    >
      <YStack
        width="100%"
        aspectRatio={4 / 5}
        borderRadius={tokens.radius.xs}
        overflow="hidden"
        backgroundColor={tokens.surfaceRaised}
        borderWidth={selected ? 2.5 : 0.5}
        borderColor={selected ? tokens.accent : tokens.border}
        position="relative"
      >
        {/* Product Image */}
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor={tokens.surfaceRaised}>
            <Text fontSize={11} color={tokens.textMuted}>No Media</Text>
          </YStack>
        )}

        {/* Multi-Selection Overlay & Checkbox */}
        {selectionMode && (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor={selected ? 'rgba(0,0,0,0.25)' : 'transparent'}
          >
            <XStack
              position="absolute"
              top={6}
              left={6}
              width={22}
              height={22}
              borderRadius={tokens.radius.full}
              backgroundColor={selected ? tokens.accent : 'rgba(0,0,0,0.45)'}
              borderWidth={1.5}
              borderColor="#ffffff"
              alignItems="center"
              justifyContent="center"
            >
              {selected && <LuCheck size={13} color="#ffffff" />}
            </XStack>
          </YStack>
        )}

        {/* Top-Right: Star Button */}
        {!selectionMode && onToggleStar && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={item.isStarred ? 'Unstar product' : 'Star product'}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleStar(item.id);
            }}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              zIndex: 10,
            }}
          >
            <XStack
              width={26}
              height={26}
              borderRadius={tokens.radius.full}
              backgroundColor="rgba(0,0,0,0.45)"
              alignItems="center"
              justifyContent="center"
            >
              <LuStar
                size={14}
                color={item.isStarred ? '#FBBF24' : '#ffffff'}
              />
            </XStack>
          </TouchableOpacity>
        )}

        {/* Bottom Metadata Bar */}
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          paddingVertical={4}
          paddingHorizontal={6}
          backgroundColor="rgba(0,0,0,0.68)"
          gap={1}
        >
          <XStack alignItems="center" justifyContent="space-between">
            {/* Price Badge */}
            <Text fontSize={11} fontWeight="800" color="#ffffff">
              ₹{item.price ? item.price.toLocaleString('en-IN') : '---'}
            </Text>

            {/* Quick Edit Icon */}
            {onQuickEdit && !selectionMode && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Quick edit SKU"
                onPress={(e) => {
                  e.stopPropagation?.();
                  onQuickEdit(item);
                }}
              >
                <LuPencil size={11} color="rgba(255,255,255,0.75)" />
              </TouchableOpacity>
            )}
          </XStack>

          {/* Subtitle / Code / Category */}
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={9} color="rgba(255,255,255,0.85)" numberOfLines={1} flex={1}>
              {item.productCode || item.category || 'SKU'}
            </Text>
            {item.timeAgo && (
              <Text fontSize={8} color="rgba(255,255,255,0.6)">
                {item.timeAgo}
              </Text>
            )}
          </XStack>
        </YStack>
      </YStack>
    </TouchableOpacity>
  );
}

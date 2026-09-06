import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuClock,
  LuPencil,
  LuTag,
  LuArchive,
  LuRotateCcw,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface AdminProductInfoSectionProps {
  title?: string;
  productCode?: string;
  vendorPrice?: number;
  category?: string;
  fabric?: string;
  timestamp?: string;
  description?: string;
  isArchived?: boolean;
  onUnarchive?: () => void;
  onEditPress?: () => void;
}

export function AdminProductInfoSection({
  title = 'Product',
  productCode = '---',
  vendorPrice,
  category,
  fabric,
  timestamp,
  description,
  isArchived = false,
  onUnarchive,
  onEditPress,
}: AdminProductInfoSectionProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderTopLeftRadius={tokens.radius.lg}
      borderTopRightRadius={tokens.radius.lg}
      paddingHorizontal={16}
      paddingTop={18}
      paddingBottom={12}
      marginTop={-14}
      gap={12}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: -2 }}
      shadowOpacity={0.06}
      shadowRadius={8}
      elevation={4}
    >
      {/* Archived Warning Banner */}
      {isArchived && (
        <XStack
          alignItems="center"
          justifyContent="space-between"
          backgroundColor="#fef3c7"
          borderLeftWidth={4}
          borderLeftColor="#f59e0b"
          paddingHorizontal={12}
          paddingVertical={10}
          borderRadius={tokens.radius.sm}
        >
          <XStack alignItems="center" gap={8} flex={1}>
            <LuArchive size={16} color="#b45309" />
            <Text fontSize={12} fontWeight="700" color="#92400e">
              This product is currently archived
            </Text>
          </XStack>

          {onUnarchive && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unarchive product"
              onPress={onUnarchive}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                paddingHorizontal={10}
                paddingVertical={4}
                borderRadius={tokens.radius.full}
                borderWidth={1}
                borderColor="#b45309"
                alignItems="center"
                gap={4}
              >
                <LuRotateCcw size={11} color="#b45309" />
                <Text fontSize={11} fontWeight="700" color="#b45309">
                  Restore
                </Text>
              </XStack>
            </Pressable>
          )}
        </XStack>
      )}

      {/* Title & SKU Code Row */}
      <XStack alignItems="flex-start" justifyContent="space-between" gap={8}>
        <Text fontSize={18} fontWeight="800" color={tokens.text} flex={1} letterSpacing={0.2}>
          {title}
        </Text>

        <XStack
          paddingHorizontal={8}
          paddingVertical={3}
          borderRadius={tokens.radius.full}
          backgroundColor={tokens.surfaceRaised}
          borderWidth={1}
          borderColor={tokens.border}
        >
          <Text fontSize={11} fontWeight="800" color={tokens.textMuted} letterSpacing={0.5}>
            {productCode}
          </Text>
        </XStack>
      </XStack>

      {/* Timestamp */}
      {timestamp && (
        <XStack alignItems="center" gap={5}>
          <LuClock size={13} color={tokens.textMuted} />
          <Text fontSize={11} color={tokens.textMuted} fontWeight="500">
            Received {timestamp} (IST)
          </Text>
        </XStack>
      )}

      {/* Price & Edit Button Row */}
      <XStack alignItems="center" justifyContent="space-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit product price and category"
          onPress={onEditPress}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack alignItems="center" gap={8}>
            <Text fontSize={24} fontWeight="900" color={tokens.accent} letterSpacing={-0.3}>
              ₹{vendorPrice !== undefined && vendorPrice !== null ? vendorPrice.toLocaleString('en-IN') : '---'}
            </Text>
            <XStack
              width={26}
              height={26}
              borderRadius={13}
              backgroundColor={`${tokens.accent}14`}
              alignItems="center"
              justifyContent="center"
            >
              <LuPencil size={13} color={tokens.accent} />
            </XStack>
          </XStack>
        </Pressable>

        {/* Category Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit category"
          onPress={onEditPress}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack
            alignItems="center"
            gap={6}
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={tokens.radius.full}
            backgroundColor={category ? `${tokens.accent}14` : tokens.surfaceRaised}
            borderWidth={1}
            borderColor={category ? `${tokens.accent}40` : tokens.border}
          >
            <LuTag size={12} color={category ? tokens.accent : tokens.textMuted} />
            <Text
              fontSize={12}
              fontWeight="700"
              color={category ? tokens.accent : tokens.textMuted}
            >
              {category ? category.toUpperCase() : 'Add Category'}
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {/* Fabric / Specs Tag Row */}
      {fabric && (
        <XStack alignItems="center" gap={6}>
          <XStack
            paddingHorizontal={8}
            paddingVertical={2}
            borderRadius={tokens.radius.xs}
            backgroundColor={tokens.surfaceRaised}
          >
            <Text fontSize={11} fontWeight="600" color={tokens.textMuted}>
              Fabric: {fabric}
            </Text>
          </XStack>
        </XStack>
      )}

      {/* Description Section */}
      <YStack gap={4} marginTop={4}>
        <Text fontSize={12} fontWeight="800" color={tokens.textMuted} letterSpacing={0.5}>
          DESCRIPTION
        </Text>
        <Text
          fontSize={13}
          lineHeight={20}
          color={tokens.text}
          opacity={description ? 0.9 : 0.5}
        >
          {description || 'No description available for this product.'}
        </Text>
      </YStack>
    </YStack>
  );
}

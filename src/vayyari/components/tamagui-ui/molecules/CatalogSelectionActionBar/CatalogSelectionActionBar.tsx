import React from 'react';
import { TouchableOpacity } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import {
  LuX,
  LuStar,
  LuLayers,
  LuArchive,
  LuTrash2,
} from '../../icons/lu';
import { useTheme } from '@/theme';

export interface CatalogSelectionActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStar?: () => void;
  onBulkMoveCategory?: () => void;
  onBulkArchive?: () => void;
  onBulkDelete?: () => void;
}

export function CatalogSelectionActionBar({
  selectedCount,
  onClearSelection,
  onBulkStar,
  onBulkMoveCategory,
  onBulkArchive,
  onBulkDelete,
}: CatalogSelectionActionBarProps) {
  const { tokens } = useTheme();

  if (selectedCount === 0) return null;

  return (
    <XStack
      position="absolute"
      bottom={16}
      left={14}
      right={14}
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.lg}
      borderWidth={1}
      borderColor={tokens.border}
      paddingVertical={8}
      paddingHorizontal={12}
      alignItems="center"
      justifyContent="space-between"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.15}
      shadowRadius={12}
      elevation={8}
    >
      {/* Left: Count Badge & Dismiss */}
      <XStack alignItems="center" gap={8}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Clear selection"
          onPress={onClearSelection}
          activeOpacity={0.7}
        >
          <XStack
            width={28}
            height={28}
            borderRadius={tokens.radius.full}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
          >
            <LuX size={14} color={tokens.text} />
          </XStack>
        </TouchableOpacity>

        <YStack>
          <Text fontSize={13} fontWeight="800" color={tokens.text}>
            {selectedCount} Selected
          </Text>
          <Text fontSize={10} color={tokens.textMuted}>
            Batch action mode
          </Text>
        </YStack>
      </XStack>

      {/* Right: Action Buttons */}
      <XStack alignItems="center" gap={6}>
        {onBulkStar && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Star selected items"
            onPress={onBulkStar}
            activeOpacity={0.7}
          >
            <XStack
              width={34}
              height={34}
              borderRadius={tokens.radius.md}
              backgroundColor={`${tokens.accent}14`}
              alignItems="center"
              justifyContent="center"
            >
              <LuStar size={16} color={tokens.accent} />
            </XStack>
          </TouchableOpacity>
        )}

        {onBulkMoveCategory && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Move category for selected items"
            onPress={onBulkMoveCategory}
            activeOpacity={0.7}
          >
            <XStack
              width={34}
              height={34}
              borderRadius={tokens.radius.md}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuLayers size={16} color={tokens.text} />
            </XStack>
          </TouchableOpacity>
        )}

        {onBulkArchive && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Archive selected items"
            onPress={onBulkArchive}
            activeOpacity={0.7}
          >
            <XStack
              width={34}
              height={34}
              borderRadius={tokens.radius.md}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuArchive size={16} color={tokens.text} />
            </XStack>
          </TouchableOpacity>
        )}

        {onBulkDelete && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Delete selected items"
            onPress={onBulkDelete}
            activeOpacity={0.7}
          >
            <XStack
              width={34}
              height={34}
              borderRadius={tokens.radius.md}
              backgroundColor="rgba(239, 68, 68, 0.12)"
              alignItems="center"
              justifyContent="center"
            >
              <LuTrash2 size={16} color="#EF4444" />
            </XStack>
          </TouchableOpacity>
        )}
      </XStack>
    </XStack>
  );
}

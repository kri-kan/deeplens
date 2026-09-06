import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import {
  LuX,
  LuStar,
  LuLayers,
  LuArchive,
  LuTrash2,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

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
      left={16}
      right={16}
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.lg}
      borderWidth={1}
      borderColor={tokens.border}
      paddingVertical={10}
      paddingHorizontal={14}
      alignItems="center"
      justifyContent="space-between"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.15}
      shadowRadius={12}
      elevation={6}
    >
      {/* Left: Count Badge & Dismiss */}
      <XStack alignItems="center" gap={8}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear selection"
          onPress={onClearSelection}
          style={{ cursor: 'pointer' } as any}
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
        </Pressable>

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Star selected items"
            onPress={onBulkStar}
            style={{ cursor: 'pointer' } as any}
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
          </Pressable>
        )}

        {onBulkMoveCategory && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Move category for selected items"
            onPress={onBulkMoveCategory}
            style={{ cursor: 'pointer' } as any}
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
          </Pressable>
        )}

        {onBulkArchive && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Archive selected items"
            onPress={onBulkArchive}
            style={{ cursor: 'pointer' } as any}
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
          </Pressable>
        )}

        {onBulkDelete && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete selected items"
            onPress={onBulkDelete}
            style={{ cursor: 'pointer' } as any}
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
          </Pressable>
        )}
      </XStack>
    </XStack>
  );
}

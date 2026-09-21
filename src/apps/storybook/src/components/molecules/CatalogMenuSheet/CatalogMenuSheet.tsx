import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuLayoutGrid,
  LuSparkles,
  LuArchive,
  LuChevronRight,
  LuCheck,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { BottomSheet } from '../../atoms/BottomSheet';

export interface CatalogMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  catalogViewMode: 'grid' | 'ai_matrix';
  onChangeViewMode: (mode: 'grid' | 'ai_matrix') => void;
  onNavArchived?: () => void;
  aiEnrichedCount?: number;
  totalProducts?: number;
}

export function CatalogMenuSheet({
  visible,
  onClose,
  catalogViewMode,
  onChangeViewMode,
  onNavArchived,
  aiEnrichedCount = 0,
  totalProducts = 0,
}: CatalogMenuSheetProps) {
  const { tokens } = useTheme();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Catalog Options"
      paddingHorizontal={16}
      paddingBottom={28}
    >
      <YStack gap={14}>
        {/* Section: View Mode */}
        <YStack gap={8}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={tokens.textMuted}
            textTransform="uppercase"
            letterSpacing={0.6}
          >
            Layout & View Mode
          </Text>

          {/* Standard Grid Option */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to Standard Grid view"
            onPress={() => {
              onChangeViewMode('grid');
              onClose();
            }}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingVertical={12}
              paddingHorizontal={14}
              borderRadius={tokens.radius.md}
              backgroundColor={
                catalogViewMode === 'grid' ? `${tokens.accent}14` : tokens.surfaceRaised
              }
              borderWidth={catalogViewMode === 'grid' ? 1.5 : 0}
              borderColor={tokens.accent}
            >
              <XStack alignItems="center" gap={12} flex={1}>
                <XStack
                  width={36}
                  height={36}
                  borderRadius={tokens.radius.full}
                  backgroundColor={
                    catalogViewMode === 'grid' ? `${tokens.accent}24` : tokens.surface
                  }
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuLayoutGrid
                    size={18}
                    color={catalogViewMode === 'grid' ? tokens.accent : tokens.text}
                  />
                </XStack>
                <YStack flex={1}>
                  <Text
                    fontSize={14}
                    fontWeight="700"
                    color={catalogViewMode === 'grid' ? tokens.accent : tokens.text}
                  >
                    Standard Grid
                  </Text>
                  <Text fontSize={12} color={tokens.textMuted}>
                    Clean 2-column responsive photo grid
                  </Text>
                </YStack>
              </XStack>
              {catalogViewMode === 'grid' && (
                <LuCheck size={18} color={tokens.accent} />
              )}
            </XStack>
          </Pressable>

          {/* AI Facet Matrix Option */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to AI Facet Matrix view"
            onPress={() => {
              onChangeViewMode('ai_matrix');
              onClose();
            }}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingVertical={12}
              paddingHorizontal={14}
              borderRadius={tokens.radius.md}
              backgroundColor={
                catalogViewMode === 'ai_matrix'
                  ? `${tokens.accent}14`
                  : tokens.surfaceRaised
              }
              borderWidth={catalogViewMode === 'ai_matrix' ? 1.5 : 0}
              borderColor={tokens.accent}
            >
              <XStack alignItems="center" gap={12} flex={1}>
                <XStack
                  width={36}
                  height={36}
                  borderRadius={tokens.radius.full}
                  backgroundColor={
                    catalogViewMode === 'ai_matrix'
                      ? `${tokens.accent}24`
                      : tokens.surface
                  }
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuSparkles
                    size={18}
                    color={catalogViewMode === 'ai_matrix' ? tokens.accent : tokens.text}
                  />
                </XStack>
                <YStack flex={1}>
                  <Text
                    fontSize={14}
                    fontWeight="700"
                    color={catalogViewMode === 'ai_matrix' ? tokens.accent : tokens.text}
                  >
                    AI Facet Matrix
                  </Text>
                  <Text fontSize={12} color={tokens.textMuted}>
                    Grouped by AI fabrics, occasions & colors
                  </Text>
                </YStack>
              </XStack>
              {catalogViewMode === 'ai_matrix' && (
                <LuCheck size={18} color={tokens.accent} />
              )}
            </XStack>
          </Pressable>
        </YStack>

        {/* Section: Management & Navigation */}
        {onNavArchived && (
          <YStack gap={8}>
            <Text
              fontSize={11}
              fontWeight="800"
              color={tokens.textMuted}
              textTransform="uppercase"
              letterSpacing={0.6}
            >
              Management
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View archived products"
              onPress={() => {
                onClose();
                onNavArchived();
              }}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                alignItems="center"
                justifyContent="space-between"
                paddingVertical={12}
                paddingHorizontal={14}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.surfaceRaised}
              >
                <XStack alignItems="center" gap={12} flex={1}>
                  <XStack
                    width={36}
                    height={36}
                    borderRadius={tokens.radius.full}
                    backgroundColor={tokens.surface}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <LuArchive size={18} color={tokens.text} />
                  </XStack>
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="700" color={tokens.text}>
                      Archived Products
                    </Text>
                    <Text fontSize={12} color={tokens.textMuted}>
                      View or restore hidden catalog items
                    </Text>
                  </YStack>
                </XStack>
                <LuChevronRight size={18} color={tokens.textMuted} />
              </XStack>
            </Pressable>
          </YStack>
        )}

        {/* Section: AI Catalog Intelligence */}
        {totalProducts > 0 && (
          <YStack
            padding={14}
            borderRadius={tokens.radius.md}
            backgroundColor={`${tokens.accent}0F`}
            borderWidth={1}
            borderColor={`${tokens.accent}2A`}
            gap={6}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" gap={6}>
                <LuSparkles size={15} color={tokens.accent} />
                <Text fontSize={13} fontWeight="800" color={tokens.accent}>
                  AI Catalog Intelligence
                </Text>
              </XStack>
              <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                {aiEnrichedCount} / {totalProducts} Enriched
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted} lineHeight={16}>
              AI models have automatically enriched attributes, fabrics, colors, and descriptive facets across your catalog.
            </Text>
          </YStack>
        )}
      </YStack>
    </BottomSheet>
  );
}

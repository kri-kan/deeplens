import React, { useState, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSearch, LuSlidersHorizontal, LuPackageSearch } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { PlannedProductInfo } from '../../molecules/post-planner.types';
import { PostPlannerProductTile } from '../../molecules/PostPlannerProductTile';

export interface PostPlannerCurationGridProps {
  items: PlannedProductInfo[];
  onSelectItem: (item: PlannedProductInfo) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showOnlyIncomplete?: boolean;
  onToggleIncompleteOnly?: (val: boolean) => void;
}

export function PostPlannerCurationGrid({
  items,
  onSelectItem,
  searchQuery: controlledQuery,
  onSearchChange,
  showOnlyIncomplete: controlledIncomplete,
  onToggleIncompleteOnly,
}: PostPlannerCurationGridProps) {
  const { tokens } = useTheme();

  const [internalQuery, setInternalQuery] = useState('');
  const [internalIncomplete, setInternalIncomplete] = useState(false);

  const query = controlledQuery !== undefined ? controlledQuery : internalQuery;
  const setQuery = onSearchChange || setInternalQuery;

  const incompleteOnly = controlledIncomplete !== undefined ? controlledIncomplete : internalIncomplete;
  const setIncompleteOnly = onToggleIncompleteOnly || setInternalIncomplete;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        const codeMatch = item.productCode.toLowerCase().includes(q);
        const titleMatch = item.title.toLowerCase().includes(q);
        const catMatch = item.category.toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !catMatch) return false;
      }
      if (incompleteOnly && item.planningStatus === 'complete') {
        return false;
      }
      return true;
    });
  }, [items, query, incompleteOnly]);

  return (
    <YStack flex={1} width="100%" backgroundColor={tokens.background}>
      {/* Search & Filter Bar */}
      <XStack
        paddingHorizontal={12}
        paddingVertical={8}
        alignItems="center"
        gap={8}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack
          flex={1}
          backgroundColor={tokens.surfaceRaised}
          borderColor={tokens.border}
          borderWidth={1}
          borderRadius={10}
          paddingHorizontal={10}
          alignItems="center"
          gap={8}
          height={38}
        >
          <LuSearch size={16} color={tokens.textMuted} />
          <TextInput
            placeholder="Search SKU, name, category..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={tokens.textMuted}
            style={styles.textInput}
          />
        </XStack>

        <Pressable
          onPress={() => setIncompleteOnly(!incompleteOnly)}
          style={[
            styles.toggleChip,
            {
              backgroundColor: incompleteOnly ? tokens.accentSubtle : tokens.surfaceRaised,
              borderColor: incompleteOnly ? tokens.accent : tokens.border,
            },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: incompleteOnly }}
          accessibilityLabel="Filter by needs planning only"
        >
          <Text
            fontSize={11}
            fontWeight="800"
            color={incompleteOnly ? tokens.accent : tokens.textSecondary}
          >
            {incompleteOnly ? 'Needs Planning' : 'All'}
          </Text>
        </Pressable>
      </XStack>

      {/* 3-Column Grid or Empty State */}
      {filteredItems.length > 0 ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PostPlannerProductTile item={item} onPress={onSelectItem} />
          )}
        />
      ) : (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={12}>
          <LuPackageSearch size={40} color={tokens.textMuted} />
          <Text fontSize={15} fontWeight="800" color={tokens.text} textAlign="center">
            No Catalog Garments Found
          </Text>
          <Text fontSize={12} color={tokens.textSecondary} textAlign="center">
            {incompleteOnly
              ? 'All starred garments have been completely planned!'
              : 'Try clearing your search query to see available garments.'}
          </Text>
        </YStack>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  textInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    outlineStyle: 'none',
  } as any,
  toggleChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  gridContainer: {
    padding: 2,
    paddingBottom: 24,
  },
});

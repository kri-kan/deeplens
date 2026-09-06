import React, { useState, useMemo } from 'react';
import { ScrollView, TextInput, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuSearch,
  LuX,
  LuSettings,
  LuSparkles,
  LuInbox,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  UtilitySection,
} from '../molecules/UtilitySection';
import {
  UtilityTileItem,
} from '../molecules/UtilityTile';

export interface UtilityGroup {
  id: string;
  title: string;
  items: UtilityTileItem[];
}

export interface OperationsHubPageProps {
  groups?: UtilityGroup[];
  disableSafeArea?: boolean;
  searchQuery?: string;
  onLaunchTool?: (route: string) => void;
  onOpenAiAssistant?: () => void;
  onOpenSettings?: () => void;
}

export function OperationsHubPage({
  groups = [],
  disableSafeArea = false,
  searchQuery = '',
  onLaunchTool,
  onOpenAiAssistant,
  onOpenSettings,
}: OperationsHubPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [query, setQuery] = useState(searchQuery);

  // Filter groups and items based on search query
  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;

    const lower = query.toLowerCase().trim();
    return groups
      .map((group) => {
        const matchedItems = group.items.filter(
          (item) =>
            item.title.toLowerCase().includes(lower) ||
            (item.description && item.description.toLowerCase().includes(lower))
        );
        return {
          ...group,
          items: matchedItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const totalFilteredCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
  }, [filteredGroups]);

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top Header - Compact */}
      <XStack
        paddingTop={topInset}
        height={48 + topInset}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <YStack gap={0}>
          <Text fontSize={15} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
            Operations Hub
          </Text>
          <Text fontSize={10} color={tokens.textMuted}>
            Operational modules & utilities
          </Text>
        </YStack>

        <XStack alignItems="center" gap={6}>
          {/* AI Assistant Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AI assistant"
            onPress={onOpenAiAssistant}
          >
            <XStack
              paddingVertical={4}
              paddingHorizontal={8}
              borderRadius={tokens.radius.full}
              backgroundColor={`${tokens.accent}14`}
              borderWidth={1}
              borderColor={`${tokens.accent}30`}
              alignItems="center"
              gap={4}
            >
              <LuSparkles size={13} color={tokens.accent} />
              <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                AI
              </Text>
            </XStack>
          </Pressable>

          {/* Settings Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings modal"
            onPress={onOpenSettings}
          >
            <XStack
              padding={6}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuSettings size={16} color={tokens.text} />
            </XStack>
          </Pressable>
        </XStack>
      </XStack>

      {/* Main Scrollable Body - High Density */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: Math.max(24, bottomInset + 16),
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar - Compact */}
        <XStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.sm}
          borderWidth={1}
          borderColor={tokens.border}
          paddingHorizontal={10}
          height={36}
          alignItems="center"
          gap={6}
        >
          <LuSearch size={14} color={tokens.textMuted} />
          <TextInput
            accessibilityLabel="Search operational tools input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search tools, modules, settings..."
            placeholderTextColor={tokens.textMuted}
            style={{
              flex: 1,
              fontSize: 12,
              color: tokens.text,
            }}
          />
          {query.trim().length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search input"
              onPress={() => setQuery('')}
            >
              <XStack
                padding={3}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.surfaceRaised}
              >
                <LuX size={10} color={tokens.textMuted} />
              </XStack>
            </Pressable>
          )}
        </XStack>

        {/* Empty State */}
        {totalFilteredCount === 0 ? (
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            paddingVertical={32}
            paddingHorizontal={16}
            alignItems="center"
            justifyContent="center"
            gap={8}
          >
            <XStack
              width={44}
              height={44}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuInbox size={22} color={tokens.textMuted} />
            </XStack>
            <Text fontSize={14} fontWeight="700" color={tokens.text}>
              No Tools Found
            </Text>
            <Text
              fontSize={11}
              color={tokens.textMuted}
              textAlign="center"
              maxWidth={240}
            >
              No operational utility matches &quot;{query}&quot;. Try a different keyword.
            </Text>
          </YStack>
        ) : (
          /* Render Categorized Groups - High Density */
          <YStack gap={10}>
            {filteredGroups.map((group) => (
              <UtilitySection
                key={group.id}
                title={group.title}
                items={group.items}
                onLaunchItem={onLaunchTool}
              />
            ))}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

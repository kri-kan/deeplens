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
} from 'react-icons/lu';
import { useTheme } from '../../theme';
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
      {/* Top Header with Safe Area Handling */}
      <XStack
        paddingTop={topInset}
        height={56 + topInset}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <YStack gap={1}>
          <Text fontSize={16} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
            Operations Hub
          </Text>
          <Text fontSize={11} color={tokens.textMuted}>
            Operational modules & system utilities
          </Text>
        </YStack>

        <XStack alignItems="center" gap={8}>
          {/* AI Assistant Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AI assistant"
            onPress={onOpenAiAssistant}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              paddingVertical={6}
              paddingHorizontal={10}
              borderRadius={tokens.radius.full}
              backgroundColor={`${tokens.accent}14`}
              borderWidth={1}
              borderColor={`${tokens.accent}30`}
              alignItems="center"
              gap={5}
            >
              <LuSparkles size={14} color={tokens.accent} />
              <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                AI
              </Text>
            </XStack>
          </Pressable>

          {/* Settings Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings modal"
            onPress={onOpenSettings}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              padding={8}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuSettings size={18} color={tokens.text} />
            </XStack>
          </Pressable>
        </XStack>
      </XStack>

      {/* Main Scrollable Body */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(32, bottomInset + 24),
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <XStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.md}
          borderWidth={1}
          borderColor={tokens.border}
          paddingHorizontal={12}
          height={42}
          alignItems="center"
          gap={8}
        >
          <LuSearch size={16} color={tokens.textMuted} />
          <TextInput
            accessibilityLabel="Search operational tools input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search tools, modules, settings..."
            placeholderTextColor={tokens.textMuted}
            style={
              {
                flex: 1,
                fontSize: 13,
                color: tokens.text,
                outlineStyle: 'none',
              } as any
            }
          />
          {query.trim().length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search input"
              onPress={() => setQuery('')}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                padding={4}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.surfaceRaised}
              >
                <LuX size={12} color={tokens.textMuted} />
              </XStack>
            </Pressable>
          )}
        </XStack>

        {/* Empty State */}
        {totalFilteredCount === 0 ? (
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            borderWidth={1}
            borderColor={tokens.border}
            paddingVertical={44}
            paddingHorizontal={20}
            alignItems="center"
            justifyContent="center"
            gap={10}
          >
            <XStack
              width={52}
              height={52}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuInbox size={26} color={tokens.textMuted} />
            </XStack>
            <Text fontSize={15} fontWeight="700" color={tokens.text}>
              No Tools Found
            </Text>
            <Text
              fontSize={12}
              color={tokens.textMuted}
              textAlign="center"
              maxWidth={260}
            >
              No operational utility matches &quot;{query}&quot;. Try a different keyword.
            </Text>
          </YStack>
        ) : (
          /* Render Categorized Groups */
          <YStack gap={20}>
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

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuChevronDown, LuChevronUp, LuUsers } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { ProfileCategoryGroup, InstagramExplorerProfile } from '../../molecules/instagram-explorer.types';
import { ActiveProfileCard } from '../../molecules/ActiveProfileCard';

export interface ActiveProfilesSectionProps {
  categories?: ProfileCategoryGroup[];
  onSelectProfile?: (profile: InstagramExplorerProfile) => void;
  onTogglePin?: (profile: InstagramExplorerProfile) => void;
}

export function ActiveProfilesSection({
  categories = [],
  onSelectProfile,
  onTogglePin,
}: ActiveProfilesSectionProps) {
  const { tokens } = useTheme();
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((cat) => {
      initial[cat.id] = cat.isExpanded ?? true;
    });
    return initial;
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <YStack gap={14}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={18} fontWeight="900" color={tokens.text} letterSpacing={0.2}>
          Active Profiles
        </Text>
      </XStack>

      <YStack gap={12}>
        {categories.map((category) => {
          const isExpanded = expandedMap[category.id] !== false;
          const count = category.profiles.length;

          return (
            <YStack
              key={category.id}
              backgroundColor={tokens.surface}
              borderRadius={16}
              borderWidth={1}
              borderColor={tokens.border}
              overflow="hidden"
              style={styles.categoryContainer}
            >
              {/* Category Header */}
              <Pressable
                onPress={() => toggleCategory(category.id)}
                style={({ pressed }) => [
                  styles.categoryHeader,
                  {
                    backgroundColor: pressed ? 'rgba(0,0,0,0.02)' : 'transparent',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${category.title}, ${count} profiles`}
              >
                <XStack alignItems="center" gap={8}>
                  <Text fontSize={14} fontWeight="800" color={tokens.text}>
                    {category.title}
                  </Text>
                  <View style={[styles.countBadge, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                    <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
                      {count}
                    </Text>
                  </View>
                </XStack>

                <View style={styles.chevronBox}>
                  {isExpanded ? (
                    <LuChevronUp size={18} color={tokens.textSecondary} />
                  ) : (
                    <LuChevronDown size={18} color={tokens.textSecondary} />
                  )}
                </View>
              </Pressable>

              {/* Profiles Grid */}
              {isExpanded && (
                <View style={styles.gridContainer}>
                  {category.profiles.length > 0 ? (
                    category.profiles.map((profile) => (
                      <ActiveProfileCard
                        key={profile.id || profile.username}
                        profile={profile}
                        onPress={onSelectProfile}
                        onTogglePin={onTogglePin}
                      />
                    ))
                  ) : (
                    <XStack padding={16} alignItems="center" justifyContent="center" gap={8} width="100%">
                      <LuUsers size={16} color={tokens.textMuted} />
                      <Text fontSize={12} color={tokens.textMuted}>
                        No profiles in this category
                      </Text>
                    </XStack>
                  )}
                </View>
              )}
            </YStack>
          );
        })}
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  categoryContainer: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 12,
    justifyContent: 'flex-start',
    rowGap: 8,
  },
});

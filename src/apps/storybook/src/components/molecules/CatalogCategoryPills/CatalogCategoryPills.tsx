import React from 'react';
import { ScrollView, Pressable } from 'react-native';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export interface CatalogCategory {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface CatalogCategoryPillsProps {
  categories: CatalogCategory[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const DEFAULT_CATALOG_CATEGORIES: CatalogCategory[] = [
  { id: 'all', label: 'All', count: 320 },
  { id: 'saree', label: 'Saree', count: 145 },
  { id: 'dress', label: 'Dress', count: 82 },
  { id: 'lehanga', label: 'Lehanga', count: 44 },
  { id: 'kids', label: 'Kids', count: 28 },
  { id: 'general', label: 'Others', count: 21 },
];

export function CatalogCategoryPills({
  categories = DEFAULT_CATALOG_CATEGORIES,
  activeCategoryId,
  onSelectCategory,
}: CatalogCategoryPillsProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      height={42}
      alignItems="center"
      backgroundColor={tokens.background}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: 10,
          gap: 6,
        }}
      >
        {categories.map((cat) => {
          const isActive = cat.id.toLowerCase() === activeCategoryId.toLowerCase();
          return (
            <Pressable
              key={cat.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cat.label}`}
              onPress={() => onSelectCategory(cat.id)}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                alignItems="center"
                height={28}
                gap={5}
                paddingHorizontal={10}
                borderRadius={tokens.radius.full}
                backgroundColor={isActive ? tokens.accent : tokens.surface}
                borderWidth={1}
                borderColor={isActive ? tokens.accent : tokens.border}
                pressStyle={{ opacity: 0.8 }}
              >
                {cat.icon}
                <Text
                  fontSize={11}
                  fontWeight={isActive ? '800' : '600'}
                  color={isActive ? '#ffffff' : tokens.text}
                >
                  {cat.label}
                </Text>

                {cat.count !== undefined && (
                  <XStack
                    paddingHorizontal={4}
                    paddingVertical={1}
                    borderRadius={tokens.radius.full}
                    backgroundColor={isActive ? 'rgba(255,255,255,0.25)' : tokens.surfaceRaised}
                  >
                    <Text
                      fontSize={9}
                      fontWeight="700"
                      color={isActive ? '#ffffff' : tokens.textMuted}
                    >
                      {cat.count}
                    </Text>
                  </XStack>
                )}
              </XStack>
            </Pressable>
          );
        })}
      </ScrollView>
    </XStack>
  );
}

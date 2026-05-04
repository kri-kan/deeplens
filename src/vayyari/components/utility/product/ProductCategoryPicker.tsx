import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CategoryIcon, CATEGORY_REGISTRY } from '@/components/CategoryIcons';
import { ProductCategory, CategoryDefinition } from '@/types/products';
import { systemService, AppCategory } from '@/services/system.service';
import { useState, useEffect } from 'react';

interface ProductCategoryPickerProps {
  selectedCategory: string;
  onSelect: (category: string) => void;
  horizontal?: boolean;
  showAll?: boolean;
}

export const ProductCategoryPicker: React.FC<ProductCategoryPickerProps> = ({
  selectedCategory,
  onSelect,
  horizontal = true,
  showAll = false,
}) => {
  const theme = useTheme();
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await systemService.getCategories();
        const formatted = list.map(c => ({
          id: c.slug,
          label: c.name,
          iconName: c.iconName
        }));

        if (showAll) {
          setCategories([{ id: 'all', label: 'All' }, ...formatted]);
        } else {
          setCategories(formatted);
        }
      } catch (error) {
        console.error('Failed to load dynamic categories', error);
        // Fallback to registry if API fails
        setCategories(CATEGORY_REGISTRY);
      }
    };
    load();
  }, [showAll]);

  const content = (
    <View style={[styles.container, !horizontal && styles.vertical]}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.item,
            selectedCategory === cat.id && { backgroundColor: theme.colors.primaryContainer }
          ]}
          onPress={() => onSelect(cat.id as ProductCategory)}
        >
          <CategoryIcon
            category={cat.id as any}
            iconName={cat.iconName}
            color={selectedCategory === cat.id ? theme.colors.primary : theme.colors.onSurfaceVariant}
            size={horizontal ? 24 : 32}
          />
          <Text
            variant="labelSmall"
            style={[
              styles.label,
              selectedCategory === cat.id ? { color: theme.colors.primary, fontWeight: 'bold' } : { color: theme.colors.onSurfaceVariant }
            ]}
          >
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (horizontal) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {content}
      </ScrollView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 8,
  },
  container: {
    flexDirection: 'row',
    gap: 6,
  },
  vertical: {
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  item: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    minWidth: 60,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
  },
});

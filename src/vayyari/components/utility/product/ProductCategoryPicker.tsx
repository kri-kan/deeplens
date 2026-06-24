import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CategoryIcon, CATEGORY_REGISTRY } from '@/components/CategoryIcons';
import { ProductCategory } from '@/types/products';
import { systemService } from '@/services/system.service';

interface ProductCategoryPickerProps {
  selectedCategory: string;
  onSelect: (category: string) => void;
  horizontal?: boolean;
  showAll?: boolean;
  categories?: any[];
}

export const ProductCategoryPicker: React.FC<ProductCategoryPickerProps> = ({
  selectedCategory,
  onSelect,
  horizontal = true,
  showAll = false,
  categories: propCategories,
}) => {
  const theme = useTheme();
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (propCategories) {
      setCategories(propCategories);
      return;
    }
    const load = async () => {
      try {
        const list = await systemService.getCategories();
        // Remove duplicate category names if any
        const formatted = list
          .filter((c, i, self) => self.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i)
          .map(c => ({
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
        setCategories(CATEGORY_REGISTRY.map(c => ({ id: c.id.toLowerCase(), label: c.label, iconName: c.id.toLowerCase() })));
      }
    };
    load();
  }, [showAll, propCategories]);

  const content = (
    <View style={[styles.container, !horizontal && styles.vertical]}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.item,
            selectedCategory?.toLowerCase() === cat.id?.toLowerCase() && { backgroundColor: theme.colors.primaryContainer }
          ]}
          onPress={() => onSelect(cat.id as ProductCategory)}
        >
          <CategoryIcon
            category={cat.id as any}
            iconName={cat.iconName}
            color={selectedCategory?.toLowerCase() === cat.id?.toLowerCase() ? theme.colors.primary : theme.colors.onSurfaceVariant}
            size={horizontal ? 24 : 32}
          />
          <Text
            variant="labelSmall"
            style={[
              styles.label,
              selectedCategory?.toLowerCase() === cat.id?.toLowerCase() ? { color: theme.colors.primary, fontWeight: 'bold' } : { color: theme.colors.onSurfaceVariant }
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

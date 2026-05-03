import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CategoryIcon, CATEGORY_REGISTRY } from '@/components/CategoryIcons';
import { ProductCategory } from '@/types/products';

interface ProductCategoryPickerProps {
  selectedCategory: ProductCategory;
  onSelect: (category: ProductCategory) => void;
  horizontal?: boolean;
}

export const ProductCategoryPicker: React.FC<ProductCategoryPickerProps> = ({
  selectedCategory,
  onSelect,
  horizontal = true,
}) => {
  const theme = useTheme();

  const content = (
    <View style={[styles.container, !horizontal && styles.vertical]}>
      {CATEGORY_REGISTRY.map((cat) => (
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

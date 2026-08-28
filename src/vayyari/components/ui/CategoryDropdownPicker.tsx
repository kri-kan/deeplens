import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Text, Menu, useTheme, IconButton } from 'react-native-paper';
import { CategoryIcon, CATEGORY_REGISTRY } from '@/components/CategoryIcons';
import { systemService } from '@/services/system.service';
import { ProductCategory } from '@/types/products';

interface CategoryOption {
  id: string;
  label: string;
  iconName?: string;
}

interface CategoryDropdownPickerProps {
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  label?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const CategoryDropdownPicker: React.FC<CategoryDropdownPickerProps> = ({
  selectedCategory,
  onSelectCategory,
  label = 'Category',
  placeholder = 'Select category',
  style,
  disabled = false,
}) => {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const list = await systemService.getCategories();
        if (!isMounted) return;

        // Deduplicate category names
        const unique = list.filter(
          (c, i, self) => self.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === i
        );

        const options: CategoryOption[] = unique.map((c) => ({
          id: c.slug || c.name.toLowerCase(),
          label: c.name,
          iconName: c.iconName || c.slug,
        }));

        if (options.length > 0) {
          setCategories(options);
        } else {
          setCategories(
            CATEGORY_REGISTRY.map((c) => ({
              id: c.id.toLowerCase(),
              label: c.label,
              iconName: c.id.toLowerCase(),
            }))
          );
        }
      } catch (error) {
        console.warn('Failed to fetch categories from API, falling back to registry', error);
        if (isMounted) {
          setCategories(
            CATEGORY_REGISTRY.map((c) => ({
              id: c.id.toLowerCase(),
              label: c.label,
              iconName: c.id.toLowerCase(),
            }))
          );
        }
      }
    };

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const openMenu = () => {
    if (!disabled) setVisible(true);
  };
  const closeMenu = () => setVisible(false);

  // Find active category item
  const normalizedSelected = selectedCategory?.trim().toLowerCase();
  const activeOption = categories.find(
    (c) => c.label.toLowerCase() === normalizedSelected || c.id.toLowerCase() === normalizedSelected
  );

  const selectedDisplayLabel = activeOption?.label || selectedCategory || '';

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
      ) : null}

      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openMenu}
            disabled={disabled}
            style={[
              styles.pickerButton,
              {
                borderColor: visible ? theme.colors.primary : theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
              disabled && { opacity: 0.6 },
            ]}
          >
            <View style={styles.pickerContent}>
              {selectedDisplayLabel ? (
                <View style={styles.selectedRow}>
                  <CategoryIcon
                    category={(activeOption?.id || selectedDisplayLabel) as ProductCategory}
                    iconName={activeOption?.iconName}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text
                    variant="bodyMedium"
                    style={[styles.selectedText, { color: theme.colors.onSurface }]}
                    numberOfLines={1}
                  >
                    {selectedDisplayLabel}
                  </Text>
                </View>
              ) : (
                <Text
                  variant="bodyMedium"
                  style={[styles.placeholderText, { color: theme.colors.outline }]}
                >
                  {placeholder}
                </Text>
              )}
            </View>
            <IconButton
              icon={visible ? 'chevron-up' : 'chevron-down'}
              size={20}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>
        }
        contentStyle={[styles.menuContent, { backgroundColor: theme.colors.elevation.level3 }]}
      >
        {categories.map((cat) => {
          const isSelected =
            normalizedSelected === cat.label.toLowerCase() ||
            normalizedSelected === cat.id.toLowerCase();
          return (
            <Menu.Item
              key={cat.id}
              onPress={() => {
                onSelectCategory(cat.label);
                closeMenu();
              }}
              title={cat.label}
              titleStyle={[
                styles.menuItemTitle,
                isSelected && { color: theme.colors.primary, fontWeight: 'bold' },
              ]}
              leadingIcon={() => (
                <CategoryIcon
                  category={cat.id as ProductCategory}
                  iconName={cat.iconName}
                  size={22}
                  color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              )}
              style={[
                styles.menuItem,
                isSelected && { backgroundColor: theme.colors.primaryContainer + '40' },
              ]}
            />
          );
        })}
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    marginBottom: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
  },
  pickerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedText: {
    fontWeight: '500',
    flex: 1,
  },
  placeholderText: {},
  dropdownIcon: {
    margin: 0,
    marginRight: -6,
  },
  menuContent: {
    borderRadius: 12,
    minWidth: 200,
    maxHeight: 320,
  },
  menuItem: {
    height: 48,
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 15,
  },
});

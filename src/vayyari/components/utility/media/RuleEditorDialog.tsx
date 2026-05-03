import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Chip, Dialog, Portal, useTheme } from 'react-native-paper';
import { MediaPreference } from '@/services/mediaSettingsService';

interface RuleEditorDialogProps {
  visible: boolean;
  onDismiss: () => void;
  editingItem: Partial<MediaPreference> | null;
  category: string;
  setCategory: (v: string) => void;
  subCategory: string;
  setSubCategory: (v: string) => void;
  retention: string;
  setRetention: (v: string) => void;
  sizes: string[];
  toggleSize: (s: string) => void;
  schema: Record<string, string[]>;
  retentionOptions: string[];
  onSave: () => void;
  onDelete: (id: string) => void;
}

export const RuleEditorDialog: React.FC<RuleEditorDialogProps> = ({
  visible,
  onDismiss,
  editingItem,
  category,
  setCategory,
  subCategory,
  setSubCategory,
  retention,
  setRetention,
  sizes,
  toggleSize,
  schema,
  retentionOptions,
  onSave,
  onDelete,
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{editingItem?.id ? 'Adjust Rule' : 'New Priority Rule'}</Dialog.Title>
        <Dialog.Content>
          <Text variant="labelLarge" style={styles.label}>Select Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            <Chip
              selected={category === ''}
              onPress={() => { setCategory(''); setSubCategory(''); }}
              style={styles.selectableChip}
              textStyle={{ color: category === '' ? theme.colors.onSecondaryContainer : theme.colors.onSurface }}
            >
              Global (None)
            </Chip>
            {Object.keys(schema).map(cat => (
              <Chip
                key={cat}
                selected={category.toLowerCase() === cat.toLowerCase()}
                onPress={() => { 
                  setCategory(cat); 
                  setSubCategory(''); 
                }}
                style={styles.selectableChip}
                textStyle={{ color: category.toLowerCase() === cat.toLowerCase() ? theme.colors.onSecondaryContainer : theme.colors.onSurface }}
              >
                {cat}
              </Chip>
            ))}
          </ScrollView>

          {category !== '' && schema[category] && schema[category].length > 0 && (
            <>
              <Text variant="labelLarge" style={styles.label}>Select Sub-Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                <Chip
                  selected={subCategory === ''}
                  onPress={() => setSubCategory('')}
                  style={styles.selectableChip}
                  textStyle={{ color: subCategory === '' ? theme.colors.onSecondaryContainer : theme.colors.onSurface }}
                >
                  All {category}
                </Chip>
                {schema[category].map(sub => (
                  <Chip
                    key={sub}
                    selected={subCategory.toLowerCase() === sub.toLowerCase()}
                    onPress={() => setSubCategory(sub)}
                    style={styles.selectableChip}
                    textStyle={{ color: subCategory.toLowerCase() === sub.toLowerCase() ? theme.colors.onSecondaryContainer : theme.colors.onSurface }}
                  >
                    {sub}
                  </Chip>
                ))}
              </ScrollView>
            </>
          )}
          
          <Text variant="bodySmall" style={styles.hint}>
            {!category ? 'Global rule applies to all media.' : 
             !subCategory ? `Rule applies to all ${category} media.` : 
             `Specific rule for ${category} / ${subCategory}.`}
          </Text>

          <Text variant="labelLarge" style={styles.label}>Lifecycle Policy (Retention)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            {retentionOptions.map(opt => (
              <Chip
                key={opt}
                selected={retention === opt}
                onPress={() => setRetention(opt)}
                style={styles.selectableChip}
                textStyle={{ color: retention === opt ? theme.colors.onSecondaryContainer : theme.colors.onSurface }}
              >
                {opt}
              </Chip>
            ))}
          </ScrollView>

          <Text variant="labelLarge" style={styles.label}>Thumbnail Variants</Text>
          <View style={styles.chipRow}>
            {['icon', 'medium', 'large', 'web-optimized', 'blur-preview'].map(s => (
              <Chip 
                key={s} 
                selected={sizes.includes(s)} 
                onPress={() => toggleSize(s)}
                style={styles.selectableChip}
                textStyle={{ color: sizes.includes(s) ? theme.colors.onSecondaryContainer : theme.colors.onSurface }}
              >
                {s}
              </Chip>
            ))}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          {editingItem?.id && (
            <Button onPress={() => onDelete(editingItem.id!)} textColor={theme.colors.error}>Delete</Button>
          )}
          <View style={{ flex: 1 }} />
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onSave} mode="contained">Apply</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 24,
  },
  label: {
    marginTop: 20,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pickerScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  selectableChip: {
    margin: 4,
  },
  hint: {
    opacity: 0.5,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
});

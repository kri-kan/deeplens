import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Surface, Text, Appbar, List, Button, Portal, Dialog, TextInput, useTheme, Card, Chip, FAB, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { mediaSettingsService, MediaPreference } from '@/services/mediaSettingsService';

export default function MediaSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [settings, setSettings] = useState<MediaPreference[]>([]);
  const [retentionOptions, setRetentionOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MediaPreference> | null>(null);
  const [visible, setVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Form State
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [retention, setRetention] = useState('days180');
  const [sizes, setSizes] = useState<string[]>([]);
  const [schema, setSchema] = useState<Record<string, string[]>>({});

  const fetchSettings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [data, options, schemaData] = await Promise.all([
        mediaSettingsService.getAll(),
        mediaSettingsService.getRetentionOptions(),
        mediaSettingsService.getSchema()
      ]);
      setSettings(data);
      setRetentionOptions(options);
      setSchema(schemaData);
    } catch (error) {
      console.error('Failed to fetch media settings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const openAdd = () => {
    setEditingItem({});
    setCategory('');
    setSubCategory('');
    setRetention(retentionOptions[0] || 'days180');
    setSizes(['icon', 'medium']);
    setVisible(true);
  };

  const openEdit = (item: MediaPreference) => {
    setEditingItem(item);
    setCategory(item.category || '');
    setSubCategory(item.subCategory || '');
    setRetention(item.retention);
    setSizes(item.thumbnailSizes);
    setVisible(true);
  };

  const handleSave = async () => {
    try {
      const payload: MediaPreference = {
        id: editingItem?.id,
        category: category.trim() === '' ? null : category.toLowerCase(),
        subCategory: subCategory.trim() === '' ? null : subCategory.toLowerCase(),
        retention: retention,
        thumbnailSizes: sizes,
        isActive: true
      };

      await mediaSettingsService.upsert(payload);
      setVisible(false);
      fetchSettings();
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await mediaSettingsService.delete(id);
      setVisible(false);
      setEditingItem(null);
      fetchSettings();
    } catch (error) {
      console.error('Failed to delete setting:', error);
    }
  };

  const toggleSize = (size: string) => {
    if (sizes.includes(size)) {
      setSizes(sizes.filter(s => s !== size));
    } else {
      setSizes([...sizes, size]);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Retention & Lifecycle" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSettings(true)} />}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.infoCard} mode="contained">
          <Card.Title 
            title="Policy Manager" 
            subtitle="Define retention tags and thumbnail overrides." 
            left={(props) => <List.Icon {...props} icon="shield-refresh-outline" />}
          />
        </Card>

        <List.Section>
          <List.Subheader>Hierarchical Rules</List.Subheader>
          {settings.map((item) => (
            <Card key={item.id} style={styles.itemCard} onPress={() => openEdit(item)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="titleMedium" style={styles.titleText}>
                      {!item.category ? '🌐 Global System Default' : 
                       !item.subCategory ? `📂 Category: ${item.category}` : 
                       `📄 ${item.category} / ${item.subCategory}`}
                    </Text>
                    <Text variant="bodySmall" style={styles.retentionText}>
                      Retention Tag: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.retention}</Text>
                    </Text>
                  </View>
                  <Button mode="text" labelStyle={{ fontSize: 12 }} onPress={() => openEdit(item)}>Manage</Button>
                </View>
                
                <View style={styles.chipRow}>
                  {item.thumbnailSizes.map(size => (
                    <Chip key={size} style={styles.chip} textStyle={{ fontSize: 10 }}>{size.toUpperCase()}</Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>
          ))}
        </List.Section>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        onPress={openAdd}
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
          <Dialog.Title>{editingItem?.id ? 'Adjust Rule' : 'New Priority Rule'}</Dialog.Title>
          <Dialog.Content>
            <Text variant="labelLarge" style={styles.label}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              <Chip
                selected={category === ''}
                onPress={() => { setCategory(''); setSubCategory(''); }}
                style={styles.selectableChip}
              >
                Global (None)
              </Chip>
              {Object.keys(schema).map(cat => (
                <Chip
                  key={cat}
                  selected={category.toLowerCase() === cat.toLowerCase()}
                  onPress={() => { 
                    setCategory(cat); 
                    setSubCategory(''); // Reset subcat when cat changes
                  }}
                  style={styles.selectableChip}
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
                  >
                    All {category}
                  </Chip>
                  {schema[category].map(sub => (
                    <Chip
                      key={sub}
                      selected={subCategory.toLowerCase() === sub.toLowerCase()}
                      onPress={() => setSubCategory(sub)}
                      style={styles.selectableChip}
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
                >
                  {s}
                </Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            {editingItem?.id && (
              <Button onPress={() => handleDelete(editingItem.id!)} textColor={theme.colors.error}>Delete</Button>
            )}
            <View style={{ flex: 1 }} />
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={handleSave} mode="contained">Apply</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  titleText: {
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  retentionText: {
    marginTop: 2,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  chip: {
    height: 26,
    borderRadius: 6,
  },
  selectableChip: {
    margin: 4,
  },
  label: {
    marginTop: 20,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 4,
  },
  formRow: {
    flexDirection: 'row',
  },
  hint: {
    opacity: 0.5,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  dialog: {
    borderRadius: 24,
  },
  pickerScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  }
});

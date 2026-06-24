import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import { Text, Button, IconButton, Surface, TextInput, Portal, Modal, Chip } from 'react-native-paper';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { systemService, AppCategory, AppIcon } from '@/services/system.service';
import { CategoryIcon } from '@/components/CategoryIcons';

export default function CategoryManagement() {
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [icons, setIcons] = useState<AppIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<AppCategory>>({});
  const [newKeyword, setNewKeyword] = useState('');

  const fetchData = async () => {
    try {
      const [catList, iconList] = await Promise.all([
        systemService.getCategories(),
        systemService.getAvailableIcons()
      ]);
      setCategories(catList);
      setIcons(iconList);
    } catch (error) {
      console.error('Failed to fetch master data', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewKeyword('');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!editingCategory.name) return;
    try {
      await systemService.upsertCategory(editingCategory);
      setEditModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save category');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await systemService.deleteCategory(id);
          fetchData();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete');
        }
      }}
    ]);
  };

  return (
    <ScreenWrapper title="Category Management" withScrollView={false}>
      <View style={styles.container}>
        <Button 
          mode="contained" 
          icon="plus" 
          onPress={() => { setEditingCategory({}); resetForm(); setEditModal(true); }}
          style={styles.addBtn}
        >
          Add New Category
        </Button>

        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchData}
          renderItem={({ item }) => (
            <Surface style={styles.card} elevation={1}>
              <CategoryIcon 
                category={item.slug as any} 
                iconName={item.iconName} 
                color="#6200ee" 
                size={24} 
              />
              <View style={styles.details}>
                <Text variant="titleMedium">{item.name}</Text>
                <Text variant="bodySmall" style={styles.slug}>Slug: {item.slug}</Text>
                <View style={styles.listKeywords}>
                  {(item.classificationKeywords || []).map((kw) => (
                    <Text key={kw} style={styles.listKeywordText}>#{kw}</Text>
                  ))}
                </View>
              </View>
              <View style={styles.actions}>
                <IconButton icon="pencil" onPress={() => { setEditingCategory(item); resetForm(); setEditModal(true); }} />
                <IconButton icon="delete" onPress={() => handleDelete(item.id)} iconColor="red" />
              </View>
            </Surface>
          )}
        />

        <Portal>
          <Modal visible={editModal} onDismiss={() => { setEditModal(false); resetForm(); }} contentContainerStyle={styles.modal}>
            <ScrollView 
              style={{ flexShrink: 1 }} 
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {editingCategory.id ? 'Edit Category' : 'New Category'}
              </Text>
              
              <TextInput
                label="Category Name"
                value={editingCategory.name}
                onChangeText={(t) => setEditingCategory({ ...editingCategory, name: t })}
                mode="outlined"
                style={styles.input}
              />

              <Text variant="labelLarge" style={styles.label}>Assign Icon</Text>
              <View style={styles.iconGrid}>
                {icons.map((icon) => (
                  <Chip
                    key={icon.id}
                    selected={editingCategory?.iconName === icon.id}
                    onPress={() => setEditingCategory({ ...editingCategory!, iconName: icon.id })}
                    style={styles.chip}
                    avatar={<CategoryIcon category="General" iconName={icon.id} color="#000" size={16} />}
                  >
                    {icon.name}
                  </Chip>
                ))}
              </View>

              <Text variant="labelLarge" style={styles.label}>Classification Keywords</Text>
              <View style={styles.keywordInputRow}>
                <TextInput
                  label="Add Keyword"
                  placeholder="e.g. kurti, dress"
                  value={newKeyword}
                  onChangeText={setNewKeyword}
                  mode="outlined"
                  style={styles.keywordInput}
                  dense
                />
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    const val = newKeyword.trim().toLowerCase();
                    if (val) {
                      const currentKws = editingCategory.classificationKeywords || [];
                      if (!currentKws.includes(val)) {
                        setEditingCategory({
                          ...editingCategory,
                          classificationKeywords: [...currentKws, val]
                        });
                      }
                      setNewKeyword('');
                    }
                  }}
                  style={styles.addKeywordBtn}
                >
                  Add
                </Button>
              </View>

              <View style={styles.keywordList}>
                {(editingCategory.classificationKeywords || []).map((kw) => (
                  <Chip
                    key={kw}
                    onClose={() => {
                      const currentKws = editingCategory.classificationKeywords || [];
                      setEditingCategory({
                        ...editingCategory,
                        classificationKeywords: currentKws.filter(k => k !== kw)
                      });
                    }}
                    style={styles.keywordChip}
                  >
                    {kw}
                  </Chip>
                ))}
                {(!editingCategory.classificationKeywords || editingCategory.classificationKeywords.length === 0) && (
                  <Text variant="bodySmall" style={styles.noKeywords}>No keywords added yet</Text>
                )}
              </View>

              <View style={styles.modalActions}>
                <Button onPress={() => { setEditModal(false); resetForm(); }}>Cancel</Button>
                <Button mode="contained" onPress={handleSave}>Save Changes</Button>
              </View>
            </ScrollView>
          </Modal>
        </Portal>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addBtn: {
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  slug: {
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'row',
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    marginBottom: 4,
  },
  keywordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  keywordInput: {
    flex: 1,
  },
  addKeywordBtn: {
    height: 48,
    justifyContent: 'center',
  },
  keywordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 24,
  },
  keywordChip: {
    marginBottom: 4,
  },
  noKeywords: {
    fontStyle: 'italic',
    color: 'gray',
    marginVertical: 8,
  },
  listKeywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  listKeywordText: {
    fontSize: 10,
    color: '#6200ee',
    backgroundColor: '#f0e6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  }
});

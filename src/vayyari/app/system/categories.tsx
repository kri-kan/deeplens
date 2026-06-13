import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!editingCategory.name) return;
    try {
      await systemService.upsertCategory(editingCategory);
      setEditModal(false);
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
          onPress={() => { setEditingCategory({}); setEditModal(true); }}
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
              </View>
              <View style={styles.actions}>
                <IconButton icon="pencil" onPress={() => { setEditingCategory(item); setEditModal(true); }} />
                <IconButton icon="delete" onPress={() => handleDelete(item.id)} iconColor="red" />
              </View>
            </Surface>
          )}
        />

        <Portal>
          <Modal visible={editModal} onDismiss={() => setEditModal(false)} contentContainerStyle={styles.modal}>
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

            <View style={styles.modalActions}>
              <Button onPress={() => setEditModal(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleSave}>Save Changes</Button>
            </View>
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  }
});

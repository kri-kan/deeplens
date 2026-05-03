import { useState, useEffect, useCallback } from 'react';
import { mediaSettingsService, MediaPreference } from '@/services/mediaSettingsService';

export const useMediaSettings = () => {
  const [settings, setSettings] = useState<MediaPreference[]>([]);
  const [retentionOptions, setRetentionOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MediaPreference> | null>(null);
  const [visible, setVisible] = useState(false);
  const [schema, setSchema] = useState<Record<string, string[]>>({});

  // Form State
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [retention, setRetention] = useState('days180');
  const [sizes, setSizes] = useState<string[]>([]);

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

  return {
    settings,
    retentionOptions,
    loading,
    refreshing,
    fetchSettings,
    editingItem,
    visible,
    setVisible,
    schema,
    category,
    setCategory,
    subCategory,
    setSubCategory,
    retention,
    setRetention,
    sizes,
    openAdd,
    openEdit,
    handleSave,
    handleDelete,
    toggleSize,
  };
};

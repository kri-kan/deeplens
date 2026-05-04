import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Surface, Text, useTheme } from 'react-native-paper';
import { ProductCategoryPicker } from './ProductCategoryPicker';
import { InstagramLinkSection } from './InstagramLinkSection';
import { ImageUploadList } from './ImageUploadList';
import { useCreateProduct } from '@/hooks/useCreateProduct';
import { ProductCategory } from '@/types/products';

interface ProductCreationFormProps {
  initialData?: {
    title?: string;
    description?: string;
    price?: string;
    category?: ProductCategory;
    linkedPosts?: any[];
    images?: any[];
  };
  onSuccess: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export const ProductCreationForm: React.FC<ProductCreationFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  submitLabel = 'Create Product'
}) => {
  const theme = useTheme();
  
  const {
    loading,
    title,
    setTitle,
    description,
    setDescription,
    price,
    setPrice,
    category,
    setCategory,
    images,
    setImages,
    pickImage,
    removeImage,
    handleCreate,
    linkedPosts,
    setLinkedPosts,
  } = useCreateProduct(onSuccess);

  // Initialize from props if available
  React.useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.description) setDescription(initialData.description);
      if (initialData.price) setPrice(initialData.price);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.linkedPosts) setLinkedPosts(initialData.linkedPosts);
      if (initialData.images) setImages(initialData.images);
    }
  }, [initialData]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Surface style={styles.form} elevation={0}>
        <TextInput
          label="Product Title *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Designer Silk Saree"
        />

        <TextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={[styles.input, { height: 120 }]}
          placeholder="Enter product details..."
        />

        <View style={styles.row}>
          <TextInput
            label="Price (Optional)"
            value={price}
            onChangeText={setPrice}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, { flex: 1 }]}
            left={<TextInput.Affix text="₹" />}
          />
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>Category *</Text>
        <ProductCategoryPicker
          selectedCategory={category}
          onSelect={(cat) => setCategory(cat as ProductCategory)}
        />

        <View style={styles.divider} />

        <ImageUploadList
          images={images}
          onPickImage={pickImage}
          onRemoveImage={removeImage}
        />

        <InstagramLinkSection
          linkedPosts={linkedPosts}
          onLinkPost={(post) => setLinkedPosts(prev => [...prev, post])}
          onRemovePost={(id) => setLinkedPosts(prev => prev.filter(p => p.id !== id))}
        />

        <View style={styles.actions}>
          {onCancel && (
            <Button mode="outlined" onPress={onCancel} style={styles.btn} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button 
            mode="contained" 
            onPress={handleCreate} 
            style={[styles.btn, { flex: 1 }]} 
            loading={loading}
            disabled={loading}
          >
            {submitLabel}
          </Button>
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },
  form: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 4,
  },
});

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Surface, Text, Appbar, TextInput, Button, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { productService } from '@/services/productService';
import { CategoryIcon, CATEGORY_REGISTRY } from '@/components/CategoryIcons';
import type { ProductCategory } from '@/types/products';

export default function CreateProductUtility() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ProductCategory>('saree');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title || !price) {
      Alert.alert('Error', 'Please enter at least a title and price.');
      return;
    }

    setLoading(true);
    try {
      const files: import('@/types/products').ProductFilePayload[] = images.map(img => ({
        uri: img.uri,
        type: img.mimeType || 'image/jpeg',
        name: img.fileName || `image_${Date.now()}.jpg`,
      }));

      await productService.createProduct({
        title,
        description,
        vendorPrice: parseFloat(price),
        category: category,
        files,
      });

      Alert.alert('Success', 'Product created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Failed to create product:', error);
      Alert.alert('Error', error.message || 'Failed to create product. Make sure the DeepLens API service is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Create Product" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.categoryContainer}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_REGISTRY.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryItem,
                  category === cat.id && { backgroundColor: theme.colors.primaryContainer }
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <CategoryIcon
                  category={cat.id}
                  color={category === cat.id ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  size={32}
                />
                <Text
                  variant="labelSmall"
                  style={[
                    styles.categoryLabel,
                    category === cat.id ? { color: theme.colors.primary, fontWeight: 'bold' } : { color: theme.colors.onSurfaceVariant }
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TextInput
          label="Product Title"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Designer Saree"
        />

        <TextInput
          label="Vendor Price (INR)"
          value={price}
          onChangeText={setPrice}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          placeholder="0.00"
        />

        <TextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
          placeholder="Details about the product..."
        />

        <View style={styles.imageSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Product Media ({images.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                <IconButton
                  icon="close-circle"
                  size={20}
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                  iconColor={theme.colors.error}
                />
              </View>
            ))}
            <TouchableOpacity style={[styles.addButton, { borderColor: theme.colors.outline }]} onPress={pickImage}>
              <IconButton icon="plus" size={32} />
              <Text variant="labelSmall">Add Media</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          Create Product
        </Button>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  input: {
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  categoryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryLabel: {
    marginTop: 4,
  },
  imageSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    opacity: 0.7,
  },
  imageScroll: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 100,
    height: 120,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    margin: 0,
  },
  addButton: {
    width: 100,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});

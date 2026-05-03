import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { productService } from '@/services/productService';
import { ProductCategory, ProductFilePayload } from '@/types/products';

export const useCreateProduct = (onSuccess: () => void) => {
  const [loading, setLoading] = useState(false);
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
      setImages(prev => [...prev, ...result.assets]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title || !price) {
      Alert.alert('Error', 'Please enter at least a title and price.');
      return;
    }

    setLoading(true);
    try {
      const files: ProductFilePayload[] = images.map(img => ({
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
        { text: 'OK', onPress: onSuccess }
      ]);
    } catch (error: any) {
      console.error('Failed to create product:', error);
      Alert.alert('Error', error.message || 'Failed to create product.');
    } finally {
      setLoading(false);
    }
  };

  return {
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
    pickImage,
    removeImage,
    handleCreate,
  };
};

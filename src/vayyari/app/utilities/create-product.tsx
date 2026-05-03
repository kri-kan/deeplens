import React from 'react';
import { View } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { ProductCategoryPicker } from '@/components/utility/product/ProductCategoryPicker';
import { ImageUploadList } from '@/components/utility/product/ImageUploadList';

import { useCreateProduct } from '@/hooks/useCreateProduct';
import { styles } from '@/styles/screens/create-product.styles';

export default function CreateProductUtility() {
  const router = useRouter();
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
    pickImage,
    removeImage,
    handleCreate,
  } = useCreateProduct(() => router.back());

  return (
    <ScreenWrapper title="Create Product">
      <View style={styles.content}>
        <Section title="Category" subtitle="Select the best fit for this item">
          <ProductCategoryPicker 
            selectedCategory={category}
            onSelect={setCategory}
            horizontal={true}
          />
        </Section>

        <View style={styles.form}>
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
        </View>

        <ImageUploadList 
          images={images}
          onPickImage={pickImage}
          onRemoveImage={removeImage}
        />

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
      </View>
    </ScreenWrapper>
  );
}

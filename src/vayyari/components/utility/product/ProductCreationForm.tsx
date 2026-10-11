import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useCreateProduct } from '@/hooks/useCreateProduct';
import { ProductCategory } from '@/types/products';
import { useShareIntentContext } from '@/context/ShareIntentContext';
import { systemService } from '@/services/system.service';
import { instagramService } from '@/services/instagram.service';
import { CATEGORY_REGISTRY } from '@/components/CategoryIcons';
import {
  AdminCreateProductPage,
  ProductCategoryOption,
  StagedMediaItem,
  LinkedInstagramPostItem,
} from '@/components/tamagui-ui/pages/AdminCreateProductPage';

export interface ProductCreationFormProps {
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
}) => {
  const { sharedMedia, commitCurrentSession, discardCurrentSession } = useShareIntentContext();
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [validationError, setValidationError] = useState('');

  const handleSuccessWrapper = async () => {
    await commitCurrentSession();
    onSuccess();
  };

  const handleCancelWrapper = async () => {
    await discardCurrentSession();
    if (onCancel) {
      onCancel();
    }
  };

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
  } = useCreateProduct(handleSuccessWrapper);

  // Fetch dynamic categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const list = await systemService.getCategories();
        const formatted: ProductCategoryOption[] = list
          .filter((c, i, self) => self.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i)
          .map(c => ({
            id: c.slug || c.name.toLowerCase(),
            label: c.name,
            iconName: c.iconName,
          }));
        setCategories(formatted);
      } catch (error) {
        console.error('Failed to load dynamic categories', error);
        setCategories(CATEGORY_REGISTRY.map(c => ({ id: c.id.toLowerCase(), label: c.label })));
      }
    };
    loadCategories();
  }, []);

  // Initialize from initialData and sharedMedia
  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.description) setDescription(initialData.description);
      if (initialData.price) setPrice(initialData.price);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.linkedPosts) setLinkedPosts(initialData.linkedPosts);
      if (initialData.images && initialData.images.length > 0) {
        setImages(initialData.images);
      }
    }

    if (sharedMedia && sharedMedia.length > 0) {
      const mappedAssets = sharedMedia.map((m, idx) => ({
        uri: m.uri,
        width: 800,
        height: 800,
        fileName: m.fileName || `staged_media_${idx}.jpg`,
        mimeType: m.type === 'video' ? 'video/mp4' : 'image/jpeg',
      }));
      setImages(prev => {
        const existingUris = new Set(prev.map(p => p.uri));
        const newToAdd = mappedAssets.filter(a => !existingUris.has(a.uri));
        return [...prev, ...newToAdd];
      });
    }
  }, [initialData, sharedMedia]);

  // Convert images to StagedMediaItem
  const stagedMedia: StagedMediaItem[] = images.map((img, idx) => ({
    id: `img-${idx}-${img.uri}`,
    uri: img.uri,
    fileName: img.fileName || undefined,
    mediaType: img.mimeType?.startsWith('video') ? 'video' : 'image',
    isPrimary: idx === 0,
  }));

  // Convert linkedPosts
  const formattedLinkedPosts: LinkedInstagramPostItem[] = linkedPosts.map(post => ({
    id: post.id || post.code || String(Math.random()),
    thumbnailUrl: post.thumbnailUrl || post.displayUrl,
    permalink: post.permalink || post.url,
    captionSnippet: post.captionSnippet || post.caption,
    productCode: post.productCode,
  }));

  const handleLinkInstagram = async (url: string) => {
    try {
      const post = await instagramService.lookupPost(url);
      setLinkedPosts(prev => [...prev, post]);
    } catch (error: any) {
      console.error('Instagram lookup failed', error);
      Alert.alert('Not Found', 'Post was not found. Make sure it has been scraped first.');
    }
  };

  const handleRemoveInstagramPost = (postId: string) => {
    setLinkedPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleRemoveMedia = (mediaId: string) => {
    const idx = stagedMedia.findIndex(m => m.id === mediaId);
    if (idx !== -1) {
      removeImage(idx);
    }
  };

  const handleSetPrimaryMedia = (mediaId: string) => {
    const idx = stagedMedia.findIndex(m => m.id === mediaId);
    if (idx > 0) {
      setImages(prev => {
        const copy = [...prev];
        const [selected] = copy.splice(idx, 1);
        copy.unshift(selected);
        return copy;
      });
    }
  };

  const handleFormSubmit = async () => {
    setValidationError('');
    if (!title.trim() || !category) {
      setValidationError('Title and Category are mandatory fields.');
      return;
    }
    if (images.length === 0 && linkedPosts.length === 0) {
      setValidationError('Please upload at least one image or link an Instagram post.');
      return;
    }
    await handleCreate();
  };

  return (
    <View style={styles.container}>
      <AdminCreateProductPage
        initialTitle={title}
        initialDescription={description}
        initialPrice={price}
        initialCategory={category || (categories[0]?.id ?? 'saree')}
        initialMedia={stagedMedia}
        initialLinkedPosts={formattedLinkedPosts}
        categories={categories.length > 0 ? categories : undefined}
        isLoading={loading}
        errorMessage={validationError}
        disableSafeArea
        onPickMedia={pickImage}
        onRemoveMedia={handleRemoveMedia}
        onSetPrimaryMedia={handleSetPrimaryMedia}
        onLinkInstagramPost={handleLinkInstagram}
        onRemoveInstagramPost={handleRemoveInstagramPost}
        onBack={handleCancelWrapper}
        onCancel={handleCancelWrapper}
        onSubmit={handleFormSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

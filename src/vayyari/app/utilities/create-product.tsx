import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ProductCreationForm } from '@/components/utility/product/ProductCreationForm';

export default function CreateProductUtility() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    sourcePostId: string; 
    title: string; 
    description: string;
    sourcePostThumbnail: string;
    sourcePostStoragePath: string;
  }>();

  const initialData = React.useMemo(() => ({
    title: params.title || '',
    description: params.description || '',
    linkedPosts: params.sourcePostId ? [{
      id: params.sourcePostId,
      thumbnailUrl: params.sourcePostThumbnail,
      storagePath: params.sourcePostStoragePath
    }] : []
  }), [params]);

  return (
    <ScreenWrapper title="Create Product">
      <View style={styles.container}>
        <ProductCreationForm
          initialData={initialData as any}
          onSuccess={() => router.back()}
          onCancel={() => router.back()}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

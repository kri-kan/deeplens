import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ProductCreationForm } from '@/components/utility/product/ProductCreationForm';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

export default function CreateProductScreen() {
    const { id, data: initialDataStr } = useLocalSearchParams();
    const router = useRouter();
    const item = initialDataStr ? JSON.parse(initialDataStr as string) : null;

    return (
        <ScreenWrapper title="Create Product">
            <Stack.Screen options={{ 
                headerTitle: 'Create Product',
                headerLeft: () => <IconButton icon="close" onPress={() => router.back()} />
            }} />
            
            <ScrollView contentContainerStyle={styles.content}>
                <ProductCreationForm
                    initialData={{
                        title: item?.title || '',
                        description: item?.description || item?.title || '',
                        linkedPosts: [{
                            id: item?.id || (id as string),
                            thumbnailUrl: item?.thumbnailUrl || item?.mediaUrl || '',
                            storagePath: item?.storagePath || ''
                        }]
                    }}
                    onSuccess={() => {
                        router.back();
                    }}
                    onCancel={() => router.back()}
                />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: 16,
    },
});

import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { ProductCreationForm } from '@/components/utility/product/ProductCreationForm';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

export default function BulkCreateScreen() {
    const { posts: postsStr } = useLocalSearchParams();
    const router = useRouter();
    const selectedPosts = postsStr ? JSON.parse(postsStr as string) : [];

    return (
        <ScreenWrapper title="Bulk Create">
            <Stack.Screen options={{ 
                headerTitle: 'Bulk Create Product',
                headerLeft: () => <IconButton icon="close" onPress={() => router.back()} />
            }} />
            
            <ScrollView contentContainerStyle={styles.content}>
                <ProductCreationForm
                    initialData={{
                        linkedPosts: selectedPosts.map((p: any) => ({
                            id: p.id,
                            thumbnailUrl: p.thumbnailUrl || p.mediaUrl,
                            storagePath: p.storagePath,
                            productCode: p.productCode
                        }))
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

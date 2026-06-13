import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { IconButton, useTheme, Button, TextInput, List, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { productService } from '@/services/productService';
import { searchApiClient, productMgmtApiClient } from '@/api/client';


export default function LinkProductScreen() {
    const params = useLocalSearchParams();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0];
    const initialData = typeof params.data === 'string' ? params.data : params.data?.[0];
    const allowedTypes = typeof params.allowedTypes === 'string' ? params.allowedTypes : params.allowedTypes?.[0];

    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const typesArray = allowedTypes 
        ? allowedTypes.split(',') 
        : ['contains', 'like'];

    const [linkType, setLinkType] = useState<string>(typesArray[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [allProducts, setAllProducts] = useState<any[]>([]);

    const fetchAllProducts = useCallback(async () => {
        try {
            setLoading(true);

            let linkedIds = new Set<string>();
            if (id) {
                try {
                    const linksData = await searchApiClient.get<any[]>(`/api/v1/products/instagram/${id}/links`);
                    if (Array.isArray(linksData)) {
                        linksData.forEach((link: any) => {
                            if (link.productId) linkedIds.add(link.productId);
                        });
                    }
                } catch (linkErr) {
                    console.error('Failed to fetch existing links', linkErr);
                }
            }

            const data = await productMgmtApiClient.get<{ products: any[]; totalCount: number }>('/api/v1/products/catalog?take=100');
            const all: any[] = data.products || [];
            const filtered = all.filter((p: any) => !linkedIds.has(p.masterProductId));

            setAllProducts(filtered);
            setSearchResults(filtered);
        } catch (error) {
            console.error('Failed to fetch initial products', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAllProducts();
    }, [fetchAllProducts]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setSearchResults(allProducts);
            return;
        }

        const filtered = allProducts.filter(p => 
            p.title?.toLowerCase().includes(query.toLowerCase()) || 
            p.productCode?.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
    };

    const handleLinkProduct = async (productId: string) => {
        setLoading(true);
        try {
            await searchApiClient.post('/api/v1/products/instagram/link', {
                postId: id,
                productId,
                linkType,
            });
            router.back();
        } catch (error) {
            console.error('Linking failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Stack.Screen options={{ 
                headerShown: true,
                headerTitle: 'Link to Product',
                headerLeft: () => <IconButton icon="close" onPress={() => router.back()} />
            }} />

            <View style={styles.content}>
                <View style={styles.typeSelector}>
                    {typesArray.map(type => (
                        <Button 
                            key={type}
                            mode={linkType === type ? 'contained' : 'outlined'}
                            onPress={() => setLinkType(type)}
                            style={styles.typeButton}
                            labelStyle={{ fontSize: 12 }}
                            compact
                        >
                            {type.toUpperCase()}
                        </Button>
                    ))}
                </View>

                {typesArray.includes('is') && (
                    <Button 
                        mode="contained-tonal"
                        icon="plus-box"
                        style={styles.createButton}
                        onPress={() => {
                            router.replace({
                                pathname: '/utilities/instagram/create-product',
                                params: { id, data: initialData }
                            } as any);
                        }}
                    >
                        Create New Product
                    </Button>
                )}
                
                <TextInput
                    label="Search Product (Code or Title)"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    mode="outlined"
                    style={styles.searchInput}
                    left={<TextInput.Icon icon="magnify" />}
                />

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <ScrollView style={styles.resultsList}>
                        {searchResults.map(p => {
                            let mediaList: any[] = [];
                            const rawMedia = p.media || (p as any).Media || (p as any).mediaJson || (p as any).MediaJson;
                            
                            if (Array.isArray(rawMedia)) {
                                mediaList = rawMedia;
                            } else if (typeof rawMedia === 'string' && rawMedia.trim().startsWith('[')) {
                                try {
                                    mediaList = JSON.parse(rawMedia);
                                } catch {
                                    mediaList = [];
                                }
                            }

                            const primaryMedia = mediaList.find((m: any) => 
                                m.isDefault || m.IsDefault || m.is_primary || m.isPrimary || m.is_default
                            ) || mediaList[0];
                            
                            let mediaUri: string | null = null;
                            if (primaryMedia) {
                                if (typeof primaryMedia === 'string') {
                                    if (primaryMedia.includes('/') || primaryMedia.includes('\\')) {
                                        mediaUri = productService.getThumbnailUrlByPath(primaryMedia, 'medium');
                                    } else if (primaryMedia.length > 10) {
                                        mediaUri = productService.getThumbnailUrl(primaryMedia, 'medium');
                                    }
                                } else {
                                    const m = primaryMedia as any;
                                    const resolvedId = m.id || m.Id || m.mediaId || m.MediaId || m.MediaID;
                                    const resolvedPath = m.storagePath || m.StoragePath || m.path || m.Path || m.filePath || m.FilePath;
                                    const isNullId = !resolvedId || resolvedId === '00000000-0000-0000-0000-000000000000';
                                    
                                    if (!isNullId) {
                                        mediaUri = productService.getThumbnailUrl(resolvedId, 'medium');
                                    } else if (resolvedPath) {
                                        mediaUri = productService.getThumbnailUrlByPath(resolvedPath, 'medium');
                                    }
                                }
                            }

                            const productId = p.masterProductId || p.MasterProductId || p.id || p.Id;

                            return (
                                <List.Item
                                    key={p.id || p.Id}
                                    title={p.title || p.Title}
                                    description={p.productCode || p.ProductCode}
                                    onPress={() => handleLinkProduct(productId)}
                                    left={props => (
                                        <View style={styles.searchItemLeft}>
                                            {mediaUri ? (
                                                <Image source={{ uri: mediaUri }} style={styles.searchThumbnail} />
                                            ) : (
                                                <List.Icon {...props} icon="package-variant" />
                                            )}
                                        </View>
                                    )}
                                    right={props => <IconButton icon="link-plus" />}
                                />
                            );
                        })}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    typeButton: {
        flex: 1,
    },
    searchInput: {
        marginBottom: 12,
    },
    resultsList: {
        flex: 1,
    },
    searchItemLeft: {
        width: 48,
        height: 48,
        borderRadius: 8,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    searchThumbnail: {
        width: '100%',
        height: '100%',
    },
    createButton: {
        marginBottom: 16,
    },
});

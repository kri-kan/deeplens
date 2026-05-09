import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, IconButton, ActivityIndicator, useTheme, Surface, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { productService } from '@/services/productService';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import type { InstagramLink } from '@/utils/instagram-helpers';

export default function ManageAssociationsScreen() {
    const params = useLocalSearchParams();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0];
    const filterType = typeof params.type === 'string' ? params.type : params.type?.[0];
    
    const theme = useTheme();
    const router = useRouter();
    const [links, setLinks] = useState<InstagramLink[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLinks = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await productService.getInstagramLinks(id);
            if (filterType) {
                const filtered = data.filter((l: any) => (l.linkType || l.LinkType || '').toLowerCase() === filterType.toLowerCase());
                setLinks(filtered);
            } else {
                setLinks(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch links', error);
        } finally {
            setLoading(false);
        }
    }, [id, filterType]);

    useEffect(() => {
        fetchLinks();
    }, [fetchLinks]);

    const handleUnlink = async (productId: string, productTitle: string) => {
        Alert.alert(
            'Unlink Product',
            `Are you sure you want to remove the association with "${productTitle}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Unlink', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await productService.unlinkInstagramPost(id!, productId);
                            await fetchLinks();
                        } catch (error: any) {
                            Alert.alert('Unlink Failed', error.message || 'Failed to unlink product');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const getThumbnail = (link: any) => {
        let mediaList: any[] = [];
        const rawMedia = link.media || link.Media || link.mediaJson || link.MediaJson;
        
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
        
        if (primaryMedia) {
            if (typeof primaryMedia === 'string') {
                if (primaryMedia.includes('/') || primaryMedia.includes('\\')) {
                    return productService.getThumbnailUrlByPath(primaryMedia, 'icon');
                }
                return productService.getThumbnailUrl(primaryMedia, 'icon');
            }
            const m = primaryMedia as any;
            const resolvedId = m.id || m.Id || m.mediaId || m.MediaId;
            const resolvedPath = m.storagePath || m.StoragePath;
            
            if (resolvedId && resolvedId !== '00000000-0000-0000-0000-000000000000') {
                return productService.getThumbnailUrl(resolvedId, 'icon');
            } else if (resolvedPath) {
                return productService.getThumbnailUrlByPath(resolvedPath, 'icon');
            }
        }
        return null;
    };

    return (
        <ScreenWrapper title={`Manage ${filterType ? filterType.toUpperCase() + ' ' : ''}Associations`}>
            <Stack.Screen options={{ headerShown: false }} />

            {loading && links.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            ) : links.length === 0 ? (
                <View style={styles.centered}>
                    <IconButton icon="link-off" size={48} iconColor="#ccc" />
                    <Text variant="bodyLarge" style={{ color: '#999' }}>No associations found</Text>
                    <Button 
                        mode="contained" 
                        onPress={() => router.push({ pathname: '/utilities/instagram/link-product', params: { id } } as any)}
                        style={{ marginTop: 20 }}
                    >
                        Link a Product
                    </Button>
                </View>
            ) : (
                <View style={styles.contentContainer}>
                    <Surface style={styles.card} elevation={1}>
                        {links.map((link, index) => {
                            const productId = link.productId;
                            const title = link.productTitle || 'Unknown Product';
                            const type = (link.linkType || 'unknown').toUpperCase();
                            const thumbnail = getThumbnail(link);

                            return (
                                <React.Fragment key={`${productId}-${index}`}>
                                    <List.Item
                                        title={title}
                                        description={`Type: ${type} • Code: ${link.productCode || 'N/A'}`}
                                        left={props => (
                                            <View style={styles.thumbnailContainer}>
                                                {thumbnail ? (
                                                    <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
                                                ) : (
                                                    <List.Icon {...props} icon="package-variant" />
                                                )}
                                            </View>
                                        )}
                                        right={props => (
                                            <IconButton 
                                                icon="link-variant-off" 
                                                iconColor={theme.colors.error}
                                                onPress={() => handleUnlink(productId, title)}
                                            />
                                        )}
                                    />
                                    {index < links.length - 1 && <Divider />}
                                </React.Fragment>
                            );
                        })}
                    </Surface>

                    <Button 
                        mode="outlined" 
                        icon="link-plus"
                        onPress={() => router.push({ pathname: '/utilities/instagram/link-product', params: { id } } as any)}
                        style={styles.addButton}
                    >
                        Add Another Link
                    </Button>
                </View>
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    contentContainer: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        backgroundColor: 'white',
        overflow: 'hidden',
    },
    thumbnailContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    addButton: {
        marginTop: 24,
    }
});

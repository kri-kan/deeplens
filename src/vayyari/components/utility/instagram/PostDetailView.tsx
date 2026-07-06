import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Text, IconButton, Surface, useTheme, Button, Portal, TextInput, List, ActivityIndicator, Modal as PaperModal } from 'react-native-paper';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ProductCreationForm } from '../product/ProductCreationForm';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { getMediaUri } from '@/utils/instagram-helpers';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';


const { width, height } = Dimensions.get('window');

interface PostDetailViewProps {
    item: any;
    onClose: () => void;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({ item, onClose }) => {
    const theme = useTheme();
    const router = useRouter();
    
    const [menuVisible, setMenuVisible] = useState(false);
    const [linkingDialog, setLinkingDialog] = useState(false);
    const [linkType, setLinkType] = useState<'is' | 'contains' | 'like'>('is');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [existingLinks, setExistingLinks] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [createDialog, setCreateDialog] = useState(false);

    const fetchLinks = async () => {
        try {
            const data = await searchApiClient.get<any[]>(`/api/v1/products/instagram/${item.id}/links`);
            setExistingLinks(data || []);
        } catch (error) {
            console.error('Failed to fetch links', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await searchApiClient.get<any[]>('/api/v1/products/categories');
            setCategories(data || []);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    useEffect(() => {
        fetchLinks();
        fetchCategories();
    }, [item.id]);

    const hasIsLink = existingLinks.some(l => l.linkType === 'is');

    const fetchAllProducts = async () => {
        try {
            setLoading(true);
            const data = await searchApiClient.get<{ products: any[] }>('/api/v1/products/catalog?take=100');
            setAllProducts(data.products || []);
            setSearchResults(data.products || []);
        } catch (error) {
            console.error('Failed to fetch initial products', error);
        } finally {
            setLoading(false);
        }
    };

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
                postId: item.id,
                productId,
                linkType,
            });
            setLinkingDialog(false);
            fetchLinks();
        } catch (error) {
            console.error('Linking failed', error);
        } finally {
            setLoading(false);
        }
    };



    return (
        <View style={styles.container}>
            <Image 
                source={{ uri: getMediaUri(item, 'large') }} 
                style={styles.fullImage}
                contentFit="cover"
            />

            <IconButton 
                icon="arrow-left" 
                iconColor="white" 
                size={28} 
                style={styles.closeButton} 
                onPress={onClose} 
            />

            <View style={styles.actionColumn}>
                <View style={styles.statItem}>
                    <IconButton icon="heart" iconColor="white" size={24} style={styles.statIcon} />
                    <Text style={styles.statText}>{(item.likeCount || 0).toLocaleString()}</Text>
                </View>

                <View style={styles.statItem}>
                    <IconButton icon="comment" iconColor="white" size={24} style={styles.statIcon} />
                    <Text style={styles.statText}>{(item.commentCount || 0).toLocaleString()}</Text>
                </View>

                <IconButton 
                    icon="open-in-new" 
                    iconColor="white" 
                    size={24} 
                    onPress={() => item.permalink && Linking.openURL(item.permalink)} 
                />

                <IconButton 
                    icon="plus" 
                    iconColor="white" 
                    size={28} 
                    onPress={() => setMenuVisible(true)} 
                />
            </View>

            {menuVisible && (
                <TouchableOpacity 
                    style={styles.actionSheetOverlay} 
                    activeOpacity={1} 
                    onPress={() => setMenuVisible(false)}
                >
                    <Surface style={styles.actionSheet} elevation={4}>
                        <Text variant="titleMedium" style={styles.actionSheetTitle}>Post Actions</Text>
                        {!hasIsLink && (
                            <List.Item
                                title="Create as Product"
                                left={props => <List.Icon {...props} icon="plus-box" />}
                                onPress={() => { 
                                    setMenuVisible(false); 
                                    setCreateDialog(true);
                                }}
                            />
                        )}
                        <List.Item
                            title="Link to Product"
                            left={props => <List.Icon {...props} icon="link-variant" />}
                            onPress={() => { 
                                setMenuVisible(false);
                                setLinkType(hasIsLink ? 'like' : 'is');
                                setLinkingDialog(true); 
                                fetchAllProducts();
                            }}
                        />
                        <Button 
                            mode="text" 
                            onPress={() => setMenuVisible(false)} 
                            style={styles.cancelButton}
                        >
                            Cancel
                        </Button>
                    </Surface>
                </TouchableOpacity>
            )}

            <View style={styles.detailsContainer}>
                <ScrollView>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Linked Products</Text>
                    {existingLinks && Array.isArray(existingLinks) && existingLinks.map(link => (
                        <List.Item
                            key={link.id}
                            title={link.productTitle}
                            description={`Relation: ${link.linkType.toUpperCase()} | SKU: ${link.productCode}`}
                            left={props => <List.Icon {...props} icon="link" />}
                            right={props => (
                                <View style={[styles.typeBadge, { backgroundColor: link.linkType === 'is' ? theme.colors.primary : theme.colors.secondary }]}>
                                    <Text style={styles.typeBadgeText}>{link.linkType}</Text>
                                </View>
                            )}
                        />
                    ))}
                    {existingLinks.length === 0 && (
                        <Text style={styles.emptyText}>No products linked yet</Text>
                    )}

                    <Text variant="bodyMedium" style={styles.caption}>{item.description || item.title}</Text>
                </ScrollView>
            </View>

            <Portal>
                <PaperModal
                    visible={linkingDialog}
                    onDismiss={() => setLinkingDialog(false)}
                    contentContainerStyle={styles.linkingOverlay}
                >
                    <Surface style={styles.linkingContent} elevation={4}>
                        <View style={styles.linkingHeader}>
                            <Text variant="titleLarge" style={styles.bold}>Link to Product</Text>
                            <IconButton icon="close" onPress={() => setLinkingDialog(false)} />
                        </View>

                        <View style={styles.typeSelector}>
                            {(['is', 'contains', 'like'] as const).map(type => {
                                const isDisabled = type === 'is' && hasIsLink;
                                return (
                                <Button 
                                    key={type}
                                    mode={linkType === type ? 'contained' : 'outlined'}
                                    onPress={() => setLinkType(type)}
                                    style={styles.typeButton}
                                    labelStyle={{ fontSize: 12 }}
                                    compact
                                    disabled={isDisabled}
                                >
                                    {type.toUpperCase()}
                                </Button>
                            )})}
                        </View>
                        
                        <TextInput
                            label="Search Product (Code or Title)"
                            value={searchQuery}
                            onChangeText={handleSearch}
                            mode="outlined"
                            style={styles.searchInput}
                        />

                        <ScrollView style={styles.searchResults}>
                            {searchResults.map(p => {
                                const existingLink = existingLinks.find(l => l.productId === p.masterProductId);
                                const primaryMedia = p.media?.find((m: any) => m.isDefault) || p.media?.[0];
                                const mediaUri = primaryMedia ? `${getSearchApiUrl()}${API_ROUTES.ATTACHMENTS.DOWNLOAD(primaryMedia.path)}` : null;

                                return (
                                    <List.Item
                                        key={p.id}
                                        title={p.title}
                                        description={p.productCode}
                                        onPress={() => handleLinkProduct(p.masterProductId)}
                                        left={props => (
                                            <View style={styles.searchItemLeft}>
                                                {mediaUri ? (
                                                    <Image source={{ uri: mediaUri }} style={styles.searchThumbnail} />
                                                ) : (
                                                    <List.Icon {...props} icon="package-variant" />
                                                )}
                                            </View>
                                        )}
                                        right={props => (
                                            <View style={styles.searchItemRight}>
                                                {existingLink ? (
                                                    <View style={[styles.existingBadge, { backgroundColor: theme.colors.primary }]}>
                                                        <Text style={styles.existingBadgeText}>{existingLink.linkType.toUpperCase()}</Text>
                                                    </View>
                                                ) : (
                                                    <IconButton icon="link-plus" />
                                                )}
                                            </View>
                                        )}
                                    />
                                );
                            })}
                        </ScrollView>
                        
                        <Button mode="contained-tonal" onPress={() => setLinkingDialog(false)} style={styles.doneButton}>
                            Done
                        </Button>
                    </Surface>
                </PaperModal>

                <PaperModal
                    visible={createDialog}
                    onDismiss={() => setCreateDialog(false)}
                    contentContainerStyle={styles.linkingOverlay}
                >
                    <Surface style={styles.linkingContent} elevation={4}>
                        <View style={styles.linkingHeader}>
                            <Text variant="titleLarge" style={styles.bold}>Create Product</Text>
                            <IconButton icon="close" onPress={() => setCreateDialog(false)} />
                        </View>
                        
                        <ProductCreationForm
                            initialData={{
                                title: item.title || '',
                                description: item.description || item.title || '',
                                linkedPosts: [{
                                    id: item.id,
                                    thumbnailUrl: item.thumbnailUrl || item.mediaUrl || '',
                                    storagePath: item.storagePath || ''
                                }]
                            }}
                            onSuccess={() => {
                                setCreateDialog(false);
                                fetchLinks();
                            }}
                            onCancel={() => setCreateDialog(false)}
                        />
                    </Surface>
                </PaperModal>
            </Portal>

            {loading && (
                <Surface style={styles.loader} elevation={4}>
                    <ActivityIndicator size="large" />
                </Surface>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullImage: {
        width: width,
        height: height * 0.6,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
    },
    actionColumn: {
        position: 'absolute',
        top: height * 0.15,
        right: 12,
        alignItems: 'center',
        gap: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statIcon: {
        margin: 0,
    },
    statText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: -10,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 10
    },
    detailsContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        marginTop: -30,
    },
    sectionTitle: {
        marginBottom: 12,
        fontWeight: 'bold',
    },
    caption: {
        marginTop: 16,
        lineHeight: 20,
        opacity: 0.8,
    },
    emptyText: {
        opacity: 0.4,
        fontStyle: 'italic',
        marginBottom: 16,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        justifyContent: 'center',
        height: 24,
        alignSelf: 'center',
    },
    typeBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
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
    searchResults: {
        maxHeight: 200,
    },
    loader: {
        position: 'absolute',
        top: height / 2 - 40,
        left: width / 2 - 40,
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
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
    searchItemRight: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    existingBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    existingBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    chip: {
        marginBottom: 4,
    },
    actionSheetOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    actionSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    actionSheetTitle: {
        marginBottom: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cancelButton: {
        marginTop: 8,
    },
    linkingOverlay: {
        padding: 20,
        justifyContent: 'center',
    },
    linkingContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        maxHeight: '90%',
    },
    linkingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    bold: {
        fontWeight: 'bold',
    },
    doneButton: {
        marginTop: 16,
    }
});

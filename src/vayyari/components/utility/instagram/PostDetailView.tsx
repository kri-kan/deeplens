import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Text, IconButton, Surface, useTheme, Menu, Button, Portal, Dialog, TextInput, List, ActivityIndicator, Chip } from 'react-native-paper';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

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
    const [createData, setCreateData] = useState({
        title: '',
        description: '',
        fabric: '',
        stitchType: '',
        workHeaviness: '',
        color: '',
        categoryId: ''
    });

    const getMediaUri = (path: string) => {
        if (path) {
            return `http://192.168.0.170:5000/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
        }
        return item.thumbnailUrl || item.mediaUrl;
    };

    const fetchLinks = async () => {
        try {
            const response = await fetch(`http://192.168.0.170:5000/api/v1/products/instagram/${item.id}/links`);
            const data = await response.json();
            setExistingLinks(data);
        } catch (error) {
            console.error('Failed to fetch links', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://192.168.0.170:5000/api/v1/products/categories');
            const data = await response.json();
            setCategories(data || []);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    useEffect(() => {
        fetchLinks();
        fetchCategories();
    }, [item.id]);

    const fetchAllProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://192.168.0.170:5000/api/v1/products/catalog?take=100`);
            const data = await response.json();
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
            const response = await fetch('http://192.168.0.170:5000/api/v1/products/instagram/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: item.id,
                    productId: productId,
                    linkType: linkType
                })
            });
            if (response.ok) {
                setLinkingDialog(false);
                fetchLinks();
            }
        } catch (error) {
            console.error('Linking failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProduct = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://192.168.0.170:5000/api/v1/products/instagram/${item.id}/create-product`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterTitle: createData.title,
                    description: createData.description,
                    fabric: createData.fabric,
                    stitchType: createData.stitchType,
                    workHeaviness: createData.workHeaviness,
                    color: createData.color,
                    categoryId: createData.categoryId,
                    tags: ['instagram', item.category].filter(Boolean)
                })
            });
            if (response.ok) {
                setCreateDialog(false);
                fetchLinks();
            }
        } catch (error) {
            console.error('Creation failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Image 
                source={{ uri: getMediaUri(item.storagePath) }} 
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
                    <Text style={styles.statText}>{(item.commentsCount || 0).toLocaleString()}</Text>
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
                        <List.Item
                            title="Create as Product"
                            left={props => <List.Icon {...props} icon="plus-box" />}
                            onPress={() => { 
                                setMenuVisible(false); 
                                setCreateData({
                                    title: item.title || '',
                                    description: item.title || '', // Using item.title as caption/description
                                    fabric: '',
                                    stitchType: '',
                                    workHeaviness: '',
                                    color: '',
                                    categoryId: ''
                                });
                                setCreateDialog(true); 
                            }}
                        />
                        <List.Item
                            title="Link to Product"
                            left={props => <List.Icon {...props} icon="link-variant" />}
                            onPress={() => { 
                                setMenuVisible(false); 
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

            {linkingDialog && (
                <View style={styles.linkingOverlay}>
                    <Surface style={styles.linkingContent} elevation={4}>
                        <View style={styles.linkingHeader}>
                            <Text variant="titleLarge" style={styles.bold}>Link to Product</Text>
                            <IconButton icon="close" onPress={() => setLinkingDialog(false)} />
                        </View>

                        <View style={styles.typeSelector}>
                            {(['is', 'contains', 'like'] as const).map(type => (
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
                                const primaryMedia = p.media?.find((m: any) => m.is_default) || p.media?.[0];
                                const mediaUri = primaryMedia ? `http://192.168.0.170:5000/api/v1/Attachment/download?path=${encodeURIComponent(primaryMedia.path)}` : null;

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
                </View>
            )}

            {createDialog && (
                <View style={styles.linkingOverlay}>
                    <Surface style={styles.linkingContent} elevation={4}>
                        <View style={styles.linkingHeader}>
                            <Text variant="titleLarge" style={styles.bold}>Create Product</Text>
                            <IconButton icon="close" onPress={() => setCreateDialog(false)} />
                        </View>
                        
                        <ScrollView style={{ maxHeight: height * 0.5 }}>
                            <TextInput
                                label="Product Title *"
                                value={createData.title}
                                onChangeText={t => setCreateData(d => ({ ...d, title: t }))}
                                mode="outlined"
                                style={styles.searchInput}
                            />
                            <TextInput
                                label="Description *"
                                value={createData.description}
                                onChangeText={t => setCreateData(d => ({ ...d, description: t }))}
                                mode="outlined"
                                multiline
                                numberOfLines={4}
                                style={[styles.searchInput, { height: 100 }]}
                            />
                            <TextInput
                                label="Fabric"
                                value={createData.fabric}
                                onChangeText={t => setCreateData(d => ({ ...d, fabric: t }))}
                                mode="outlined"
                                style={styles.searchInput}
                                placeholder="e.g. Silk, Georgette"
                            />
                            <TextInput
                                label="Stitch Type"
                                value={createData.stitchType}
                                onChangeText={t => setCreateData(d => ({ ...d, stitchType: t }))}
                                mode="outlined"
                                style={styles.searchInput}
                                placeholder="e.g. Unstitched, Ready-made"
                            />
                            <TextInput
                                label="Work Heaviness"
                                value={createData.workHeaviness}
                                onChangeText={t => setCreateData(d => ({ ...d, workHeaviness: t }))}
                                mode="outlined"
                                style={styles.searchInput}
                                placeholder="e.g. Light, Heavy"
                            />
                            <TextInput
                                label="Color"
                                value={createData.color}
                                onChangeText={t => setCreateData(d => ({ ...d, color: t }))}
                                mode="outlined"
                                style={styles.searchInput}
                            />

                            <Text style={[styles.bold, { marginTop: 16, marginBottom: 8 }]}>Category *</Text>
                            <View style={styles.categoryContainer}>
                                {categories.map(cat => (
                                    <Chip
                                        key={cat.id}
                                        selected={createData.categoryId === cat.id}
                                        onPress={() => setCreateData(d => ({ ...d, categoryId: cat.id }))}
                                        style={styles.chip}
                                    >
                                        {cat.name}
                                    </Chip>
                                ))}
                            </View>
                        </ScrollView>

                        <Button 
                            mode="contained" 
                            onPress={handleCreateProduct} 
                            style={styles.doneButton}
                            loading={loading}
                            disabled={!createData.title || !createData.description || !createData.categoryId || loading}
                        >
                            Finalize & Create
                        </Button>
                    </Surface>
                </View>
            )}

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
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
        zIndex: 200,
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

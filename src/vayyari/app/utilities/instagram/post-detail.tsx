import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Text, IconButton, Surface, useTheme, Menu, Button, Portal, Dialog, TextInput, List, ActivityIndicator, Chip, Appbar } from 'react-native-paper';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { instagramService } from '@/services/instagram.service';
import * as Clipboard from 'expo-clipboard';
import { ToastAndroid, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function PostDetailScreen() {
    const { id, data: initialData } = useLocalSearchParams();
    const theme = useTheme();
    const router = useRouter();
    
    const [item, setItem] = useState<any>(initialData ? JSON.parse(initialData as string) : null);
    const [loading, setLoading] = useState(!item);
    const [existingLinks, setExistingLinks] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    
    const hasIsLink = !!item?.productCode || !!item?.ProductCode || existingLinks.some(link => link.linkType === 'is');
    const productCodeToDisplay = item?.productCode || item?.ProductCode || existingLinks.find(l => l.linkType === 'is')?.productCode;

    const copyToClipboard = async (text: string) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        if (Platform.OS === 'android') {
            ToastAndroid.show('Product ID copied!', ToastAndroid.SHORT);
        }
    };

    const getMediaUri = (path: string) => {
        if (path) {
            const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL;
            return `${baseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
        }
        return item?.thumbnailUrl || item?.mediaUrl;
    };

    const fetchPostDetails = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await instagramService.getVideoDetails(id as string);
            setItem(data);
        } catch (error) {
            console.error('Failed to fetch post details', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLinks = async () => {
        if (!item?.id) return;
        try {
            // Using the hardcoded IP from PostDetailView.tsx for consistency, but should ideally be from config
            const response = await fetch(`http://192.168.0.170:5000/api/v1/products/instagram/${item.id}/links`);
            const data = await response.json();
            setExistingLinks(data);
        } catch (error) {
            console.error('Failed to fetch links', error);
        }
    };

    useEffect(() => {
        if (!item && id) {
            fetchPostDetails();
        }
    }, [id]);

    useEffect(() => {
        if (item?.id) {
            fetchLinks();
        }
    }, [item?.id]);

    if (loading || !item) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 16 }}>Loading post details...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
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
                onPress={() => router.back()} 
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
                    onPress={() => {
                        // Navigate to a dedicated action screen or show a menu
                        router.push({
                            pathname: '/utilities/instagram/post-actions',
                            params: { id: item.id, data: JSON.stringify(item) }
                        } as any);
                    }} 
                />
            </View>

            <View style={styles.detailsContainer}>
                <ScrollView>
                    <TouchableOpacity 
                        onPress={() => setIsExpanded(!isExpanded)} 
                        style={styles.captionContainer}
                        activeOpacity={0.7}
                    >
                        <Text 
                            variant="bodyMedium" 
                            style={styles.caption}
                            numberOfLines={isExpanded ? undefined : 1}
                        >
                            {item.caption || item.description || item.title}
                        </Text>
                        <IconButton 
                            icon={isExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            style={styles.expandIcon}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerRow}>
                        {productCodeToDisplay ? (
                            <TouchableOpacity onPress={() => copyToClipboard(productCodeToDisplay)}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    ProductId: {productCodeToDisplay}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Button 
                                mode="contained" 
                                compact
                                icon="plus"
                                style={{ borderRadius: 6 }}
                                onPress={() => router.push({
                                    pathname: '/utilities/instagram/link-product',
                                    params: { id: item.id, data: JSON.stringify(item), allowedTypes: 'is' }
                                } as any)}
                            >
                                Add or Link Product
                            </Button>
                        )}
                        <Button 
                            mode="text" 
                            compact 
                            onPress={() => router.push({
                                pathname: '/utilities/instagram/link-product',
                                params: { id: item.id, data: JSON.stringify(item), allowedTypes: 'contains,like' }
                            } as any)}
                        >
                            Manage Associations
                        </Button>
                    </View>

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
                    
                    <View style={styles.bottomActions}>
                        {!hasIsLink && (
                            <Button 
                                mode="contained" 
                                icon="plus-box" 
                                onPress={() => router.push({
                                    pathname: '/utilities/instagram/create-product',
                                    params: { id: item.id, data: JSON.stringify(item) }
                                } as any)}
                                style={styles.createBtn}
                            >
                                Create as Product
                            </Button>
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    fullImage: {
        width: width,
        height: height * 0.6,
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        left: 10,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontWeight: 'bold',
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
        fontSize: 12,
        fontWeight: 'bold',
    },
    captionContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingBottom: 16,
        paddingTop: 16,
    },
    caption: {
        flex: 1,
        color: '#666',
        lineHeight: 20,
    },
    expandIcon: {
        margin: 0,
        padding: 0,
        width: 24,
        height: 24,
        marginTop: -2,
    },
    bottomActions: {
        marginTop: 24,
        marginBottom: 40,
    },
    createBtn: {
        borderRadius: 12,
    }
});

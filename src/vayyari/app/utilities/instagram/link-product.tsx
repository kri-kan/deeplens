import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, IconButton, Surface, useTheme, Button, TextInput, List, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function LinkProductScreen() {
    const { id, data: initialData, allowedTypes } = useLocalSearchParams();
    const theme = useTheme();
    const router = useRouter();
    
    const [item, setItem] = useState<any>(initialData ? JSON.parse(initialData as string) : null);
    
    const typesArray = allowedTypes 
        ? (allowedTypes as string).split(',') 
        : ['contains', 'like'];

    const [linkType, setLinkType] = useState<string>(typesArray[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [allProducts, setAllProducts] = useState<any[]>([]);

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

    useEffect(() => {
        fetchAllProducts();
    }, []);

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
                    postId: id,
                    productId: productId,
                    linkType: linkType
                })
            });
            if (response.ok) {
                router.back();
            }
        } catch (error) {
            console.error('Linking failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
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

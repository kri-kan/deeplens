import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Surface, Text, Appbar, TextInput, Button, useTheme, ActivityIndicator, IconButton, Card, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { OrderIdEntry, OrderItem } from '@/types/orders';

export default function OrderFormScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orderData, setOrderData] = useState<OrderIdEntry | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [globalComments, setGlobalComments] = useState('');

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const response = await searchApiClient.get<any>(`/api/orders/${id}`);
            const data = response.data;
            setOrderData(data);
            setItems(data.items || []);
            setGlobalComments(data.orderDetails || '');
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            Alert.alert('Error', 'Could not load order details.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { productId: '', photoUrl: '', comments: '' }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof OrderItem, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const copyToClipboard = async (text: string, label: string) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        Alert.alert('Copied', `${label} copied to clipboard.`);
    };

    const handleSave = async () => {
        if (!id) return;
        try {
            setSaving(true);
            await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(id), {
                phone: orderData?.customerPhone,
                address: orderData?.customerAddress,
                orderDetails: globalComments,
                source: orderData?.source,
                sourceHandle: orderData?.instagramHandle,
                paymentMode: orderData?.paymentMethod,
                items: items
            });
            Alert.alert('Success', 'Order form saved successfully.');
            router.back();
        } catch (error) {
            console.error('Failed to update order details:', error);
            Alert.alert('Error', 'Failed to save form.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 10 }}>Loading Order Data...</Text>
            </View>
        );
    }

    return (
        <Surface style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Appbar.Header elevated mode="center-aligned">
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title={`Order: ${id}`} titleStyle={{ fontWeight: 'bold' }} />
                <Appbar.Action icon="content-save" onPress={handleSave} disabled={saving} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
                {/* Header Info */}
                <Card mode="contained" style={{ backgroundColor: theme.colors.surfaceVariant }}>
                    <Card.Content>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View>
                                <Text variant="labelLarge" style={{ opacity: 0.6 }}>Platform</Text>
                                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{orderData?.source?.toUpperCase()}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text variant="labelLarge" style={{ opacity: 0.6 }}>Payment</Text>
                                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{orderData?.paymentMethod}</Text>
                            </View>
                        </View>
                        {orderData?.customerPhone || orderData?.instagramHandle ? (
                            <View style={{ marginTop: 12 }}>
                                <Text variant="labelLarge" style={{ opacity: 0.6 }}>Customer Handle</Text>
                                <Text variant="bodyLarge">{orderData?.customerPhone || orderData?.instagramHandle}</Text>
                            </View>
                        ) : null}
                    </Card.Content>
                </Card>

                {/* Global Comments */}
                <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Order Comments</Text>
                        <IconButton 
                            icon="content-copy" 
                            size={20} 
                            onPress={() => copyToClipboard(globalComments, 'Comments')}
                            disabled={!globalComments}
                        />
                    </View>
                    <TextInput
                        placeholder="Global instructions, air courier details, etc..."
                        value={globalComments}
                        onChangeText={setGlobalComments}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Product List */}
                <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Product Details</Text>
                        <Button icon="plus" mode="contained-tonal" onPress={handleAddItem}>Add Item</Button>
                    </View>

                    {items.map((item, index) => (
                        <Card key={index} mode="outlined" style={{ borderRadius: 16 }}>
                            <Card.Title 
                                title={`#${index + 1} Product`} 
                                right={(props) => (
                                    <IconButton {...props} icon="trash-can-outline" iconColor={theme.colors.error} onPress={() => removeItem(index)} />
                                )}
                            />
                            <Card.Content style={{ gap: 12 }}>
                                <TextInput
                                    label="Product ID / Name"
                                    value={item.productId}
                                    onChangeText={(val) => updateItem(index, 'productId', val)}
                                    mode="outlined"
                                    dense
                                />
                                
                                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <TextInput
                                            label="Photo URL"
                                            value={item.photoUrl}
                                            onChangeText={(val) => updateItem(index, 'photoUrl', val)}
                                            mode="outlined"
                                            dense
                                            right={
                                                <TextInput.Icon 
                                                    icon="content-copy" 
                                                    onPress={() => copyToClipboard(item.photoUrl || '', 'Photo URL')} 
                                                />
                                            }
                                        />
                                    </View>
                                    <TouchableOpacity 
                                        style={{ 
                                            width: 60, 
                                            height: 60, 
                                            borderRadius: 8, 
                                            backgroundColor: theme.colors.surfaceVariant,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            overflow: 'hidden',
                                            borderWidth: 1,
                                            borderColor: theme.colors.outlineVariant
                                        }}
                                    >
                                        {item.photoUrl ? (
                                            <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <IconButton icon="camera" size={24} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -4, marginRight: -8 }}>
                                        <IconButton 
                                            icon="content-copy" 
                                            size={18} 
                                            onPress={() => copyToClipboard(item.comments || '', 'Item comment')}
                                            disabled={!item.comments}
                                        />
                                    </View>
                                    <TextInput
                                        label="Item Features & Comments"
                                        placeholder="Size, design nodes, special color requests..."
                                        value={item.comments}
                                        onChangeText={(val) => updateItem(index, 'comments', val)}
                                        mode="outlined"
                                        multiline
                                        numberOfLines={3}
                                        dense
                                    />
                                </View>
                            </Card.Content>
                        </Card>
                    ))}

                    {items.length === 0 && (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <IconButton icon="package-variant" size={48} style={{ opacity: 0.3 }} />
                            <Text style={{ opacity: 0.5 }}>No products added yet.</Text>
                            <Button onPress={handleAddItem} style={{ marginTop: 8 }}>Initialize Items</Button>
                        </View>
                    )}
                </View>

                <Button 
                    mode="contained" 
                    onPress={handleSave} 
                    loading={saving}
                    disabled={saving}
                    style={{ marginTop: 8, borderRadius: 12 }}
                    contentStyle={{ height: 55 }}
                >
                    Finalize Order Form
                </Button>
                
                <View style={{ height: 40 }} />
            </ScrollView>
        </Surface>
    );
}

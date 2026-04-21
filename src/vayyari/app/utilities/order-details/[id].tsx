import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, TouchableOpacity, Image, Linking } from 'react-native';
import { Surface, Text, Appbar, TextInput, Button, useTheme, ActivityIndicator, IconButton, Card, Divider, Chip, Icon, Portal, Modal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { OrderIdEntry, OrderItem, OrderComment } from '@/types/orders';
import { ImagePreviewModal } from '@/components/ui/ImagePreviewModal';
import { PlatformHandle } from '@/components/ui/PlatformHandle';

export default function OrderFormScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orderData, setOrderData] = useState<OrderIdEntry | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [comments, setComments] = useState<OrderComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [newCommentAttachments, setNewCommentAttachments] = useState<any[]>([]);
    const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [isEditingTxn, setIsEditingTxn] = useState(false);
    const [screenshotUrl, setScreenshotUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isProductsExpanded, setIsProductsExpanded] = useState(true);
    const [isCommentsExpanded, setIsCommentsExpanded] = useState(true);

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const response = await searchApiClient.get<any>(API_ROUTES.ORDERS.GET_BY_ID(id));
            const data = response;
            setOrderData(data);
            setItems(data.items || []);
            setTransactionId(data.transactionId || '');
            
            // Extract screenshot from attachments (tag: receipt)
            const receipt = data.attachments?.find((a: any) => a.tag === 'receipt');
            if (receipt) {
                const downloadUrl = `${process.env.EXPO_PUBLIC_SEARCH_API_URL}${API_ROUTES.ATTACHMENTS.DOWNLOAD(receipt.key)}`;
                setScreenshotUrl(downloadUrl);
            } else {
                setScreenshotUrl('');
            }

            fetchComments();
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

    const fetchComments = async () => {
        if (!id) return;
        try {
            const data = await searchApiClient.get<OrderComment[]>(`/api/v1/Comment/order/${id}`);
            
            // Parse attachments if they come back as a JSON string from Postgres
            const parsed = data.map(comment => ({
                ...comment,
                attachments: typeof comment.attachments === 'string' ? JSON.parse(comment.attachments) : comment.attachments
            }));
            
            setComments(parsed);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleAttachFiles = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'image/*', 
                    'application/pdf', 
                    'text/plain', 
                    'application/msword', 
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                    'application/vnd.ms-excel', 
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ],
                multiple: true
            });

            if (!result.canceled) {
                const mapped = result.assets.map(a => ({
                    ...a,
                    isExisting: false
                }));
                setNewCommentAttachments(prev => [...prev, ...mapped]);
            }
        } catch (error) {
            console.error('Pick Document Error:', error);
            Alert.alert('Error', 'Failed to pick documents.');
        }
    };

    const removeAttachedFile = (idx: number) => {
        setNewCommentAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const uploadCommentAttachment = async (uri: string, name: string, mimeType?: string) => {
        const formData = new FormData();
        // @ts-ignore
        formData.append('file', {
            uri: uri,
            name: name,
            type: mimeType || 'application/octet-stream',
        });

        const uploadUrl = API_ROUTES.ATTACHMENTS?.UPLOAD || '/api/v1/Attachment/upload';
        const fullUrl = `${process.env.EXPO_PUBLIC_SEARCH_API_URL}${uploadUrl}?entityType=order&entityId=${id}&tag=note_attachment`;
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${errText}`);
        }
        
        return await response.json();
    };

    const handleAddComment = async () => {
        if ((!newComment.trim() && newCommentAttachments.length === 0) || !id) return;
        try {
            setIsUploadingAttachments(true);
            const attachmentIds: string[] = [];

            // 1. Upload each attachment sequentially
            console.log(`[Adding Comment] Starting sequential upload for ${newCommentAttachments.length} files...`);
            for (let i = 0; i < newCommentAttachments.length; i++) {
                const doc = newCommentAttachments[i];
                if (doc.isExisting && doc.id) {
                    attachmentIds.push(doc.id);
                    continue;
                }
                
                try {
                    console.log(`[Upload] Processing ${i + 1}/${newCommentAttachments.length}: ${doc.name}`);
                    const result = await uploadCommentAttachment(doc.uri, doc.name, doc.mimeType);
                    if (result.id) {
                        attachmentIds.push(result.id);
                        console.log(`[Upload] Success: ${doc.name} -> ID: ${result.id}`);
                    }
                } catch (err) {
                    console.error(`[Upload] Failed for ${doc.name}:`, err);
                }
            }
            console.log(`[Adding Comment] Finished all uploads. Total IDs: ${attachmentIds.length}`);

            // 2. Save the comment with linked attachment IDs
            const isEditing = !!editingCommentId;
            if (isEditing) {
                await searchApiClient.put(`/api/v1/Comment/${editingCommentId}`, {
                    Content: newComment,
                    AttachmentIds: attachmentIds
                });
            } else {
                await searchApiClient.post(`/api/v1/Comment`, {
                    EntityType: 'order',
                    EntityId: id,
                    Content: newComment,
                    AttachmentIds: attachmentIds
                });
            }

            setNewComment('');
            setEditingCommentId(null);
            setNewCommentAttachments([]);
            
            // Artificial delay to ensure DB consistency before refresh
            setTimeout(() => fetchComments(), 300);
            
            Alert.alert('Success', 'Note posted.');
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save comment.');
        } finally {
            setIsUploadingAttachments(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        Alert.alert('Delete', 'Delete this comment?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await searchApiClient.delete(`/api/v1/Comment/${commentId}`);
                        fetchComments();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete comment.');
                    }
                }
            }
        ]);
    };

    const startEditComment = (comment: OrderComment) => {
        setNewComment(comment.content);
        setEditingCommentId(comment.id || null);
        
        // Map existing attachments to our attachment format
        if (comment.attachments) {
            const existing = comment.attachments.map(att => ({
                id: att.id,
                name: att.name,
                uri: `${process.env.EXPO_PUBLIC_SEARCH_API_URL}${API_ROUTES.ATTACHMENTS.DOWNLOAD(att.key)}`,
                mimeType: att.contentType,
                isExisting: true,
                key: att.key
            }));
            setNewCommentAttachments(existing);
        } else {
            setNewCommentAttachments([]);
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
    };

    const pickImage = async (isReplace: boolean = false) => {
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera roll permissions to change your screenshot.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadImage(result.assets[0].uri, isReplace);
        }
    };

    const uploadImage = async (uri: string, isReplace: boolean = false) => {
        try {
            setIsUploading(true);
            
            // 1. If replacing, mark old attachment for deletion
            if (isReplace) {
                const oldReceipt = orderData?.attachments?.find((a: any) => a.tag === 'receipt');
                if (oldReceipt?.id) {
                    try {
                        await searchApiClient.delete(`/api/v1/Attachment/${oldReceipt.id}`);
                    } catch (e) {
                        console.error('Failed to mark old attachment for deletion:', e);
                    }
                }
            }

            const formData = new FormData();
            
            // @ts-ignore - FormData expects any for file URI in React Native fetch
            formData.append('file', {
                uri: uri,
                name: `txn_${id}.jpg`,
                type: 'image/jpeg',
            });

            const uploadUrl = `${API_ROUTES.ATTACHMENTS?.UPLOAD || '/api/v1/Attachment/upload'}`;
            // Manual fetch for multipart because searchApiClient might not handle FormData yet
            const response = await fetch(`${process.env.EXPO_PUBLIC_SEARCH_API_URL}${uploadUrl}?entityType=order&entityId=${id}&tag=receipt`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    // Note: Content-Type is auto-set by fetch with boundary for FormData
                },
            });

            if (!response.ok) throw new Error('Upload failed');
            
            Alert.alert('Success', 'Screenshot uploaded successfully.');
            fetchOrderDetails();
        } catch (error) {
            console.error('Upload Error:', error);
            Alert.alert('Error', 'Failed to upload image.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteScreenshot = async () => {
        const oldReceipt = orderData?.attachments?.find((a: any) => a.tag === 'receipt');
        if (!oldReceipt?.id) return;

        try {
            setIsUploading(true);
            await searchApiClient.delete(`/api/v1/Attachment/${oldReceipt.id}`);
            Alert.alert('Deleted', 'Screenshot has been removed.');
            fetchOrderDetails();
        } catch (error) {
            console.error('Delete Error:', error);
            Alert.alert('Error', 'Failed to delete screenshot.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!id) return;
        try {
            setSaving(true);
            await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(id), {
                phone: orderData?.customerPhone,
                address: orderData?.customerAddress,
                source: orderData?.source,
                sourceHandle: orderData?.instagramHandle || orderData?.customerPhone,
                paymentMode: orderData?.paymentMethod,
                items: items,
                transactionId: transactionId,
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
            <Appbar.Header elevated>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content 
                    title={`Order: ${id}`} 
                    onPress={() => copyToClipboard(id || '', 'Order ID')}
                    titleStyle={{ fontWeight: 'bold' }}
                />
                {orderData?.timestamp && (
                    <View style={{ paddingRight: 16 }}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                            {new Date(orderData.timestamp).toLocaleString(undefined, {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            }).replace(',', '')}
                        </Text>
                    </View>
                )}
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 4, gap: 24 }}>
                {/* Header Info */}
                <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text variant="labelLarge" style={{ opacity: 0.6, marginRight: 4 }}>Source:</Text>
                            <PlatformHandle 
                                source={orderData?.source || ''} 
                                handle={orderData?.source === 'whatsapp' ? (orderData?.customerPhone || '') : (orderData?.instagramHandle || orderData?.sourceHandle || '')}
                                fontSize={15}
                            />
                        </View>
                        <Chip 
                            mode="flat" 
                            selectedColor={orderData?.paymentMethod === 'Prepaid' ? '#4CAF50' : '#FF9800'}
                            style={{ backgroundColor: orderData?.paymentMethod === 'Prepaid' ? '#E8F5E9' : '#FFF3E0' }}
                        >
                            {orderData?.paymentMethod || 'COD'}
                        </Chip>
                    </View>

                    {/* Transaction Tracking */}
                    <Surface style={{ borderRadius: 12, padding: 2, backgroundColor: theme.colors.surface }} elevation={1}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <Text variant="labelLarge" style={{ opacity: 0.5 }}>Txn ID:</Text>
                                {isEditingTxn ? (
                                    <TextInput
                                        value={transactionId}
                                        onChangeText={setTransactionId}
                                        mode="outlined"
                                        dense
                                        autoFocus
                                        onBlur={() => setIsEditingTxn(false)}
                                        style={{ flex: 1, height: 36, backgroundColor: 'transparent' }}
                                        right={<TextInput.Icon icon="check" onPress={() => setIsEditingTxn(false)} />}
                                    />
                                ) : (
                                    <TouchableOpacity 
                                        onPress={() => setIsEditingTxn(true)}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                    >
                                        <Text variant="bodyLarge" style={{ 
                                            fontWeight: 'bold',
                                            color: transactionId ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                                        }}>
                                            {transactionId || 'Not Set'}
                                        </Text>
                                        <Icon source="pencil-outline" size={14} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                {/* Receipt Thumbnail with Loader */}
                                <TouchableOpacity 
                                    onPress={() => {
                                        if (!screenshotUrl) {
                                            pickImage(false);
                                            return;
                                        }
                                        const now = Date.now();
                                        if (now - lastTap < 300) {
                                            setPreviewImage(screenshotUrl);
                                        } else {
                                            setLastTap(now);
                                        }
                                    }}
                                    onLongPress={() => {
                                        Alert.alert('Manage Screenshot', 'What would you like to do?', [
                                            { text: 'Replace', onPress: () => pickImage(true) },
                                            { text: 'Delete', onPress: handleDeleteScreenshot, style: 'destructive' },
                                            { text: 'Cancel', style: 'cancel' }
                                        ]);
                                    }}
                                    disabled={isUploading}
                                    style={{ 
                                        width: 44, 
                                        height: 44, 
                                        borderRadius: 8, 
                                        backgroundColor: theme.colors.surfaceVariant,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        overflow: 'hidden',
                                        borderWidth: 1,
                                        borderColor: theme.colors.outlineVariant
                                    }}
                                >
                                    {screenshotUrl ? (
                                        <Image source={{ uri: screenshotUrl }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <Icon source="upload" size={20} color={theme.colors.onSurfaceVariant} />
                                    )}
                                    
                                    {isUploading && (
                                        <View style={{ 
                                            position: 'absolute', 
                                            top: 0, left: 0, right: 0, bottom: 0, 
                                            backgroundColor: 'rgba(255,255,255,0.7)', 
                                            justifyContent: 'center', 
                                            alignItems: 'center' 
                                        }}>
                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <IconButton 
                                    icon="information-outline" 
                                    size={18} 
                                    style={{ margin: 0 }}
                                    onPress={() => Alert.alert('Image Gestures', '• Double tap to preview\n• Long press to replace/delete')}
                                />
                            </View>
                        </View>
                    </Surface>
                </View>

                {/* Product List */}
                <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TouchableOpacity 
                            onPress={() => setIsProductsExpanded(!isProductsExpanded)}
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                            activeOpacity={0.7}
                        >
                            <Icon source={isProductsExpanded ? "chevron-down" : "chevron-right"} size={24} color={theme.colors.onSurface} />
                            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginLeft: 4 }}>Product Details</Text>
                            <View style={{ 
                                marginLeft: 8, 
                                backgroundColor: theme.colors.surfaceVariant, 
                                paddingHorizontal: 8, 
                                borderRadius: 12,
                                height: 20,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', lineHeight: 14 }}>{items.length}</Text>
                            </View>
                        </TouchableOpacity>
                        <Button icon="plus" mode="contained-tonal" onPress={handleAddItem}>Add Item</Button>
                    </View>

                    {isProductsExpanded && (
                        <>
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
                                        onPress={() => {
                                            const now = Date.now();
                                            if (now - lastTap < 300) {
                                                if (item.photoUrl) setPreviewImage(item.photoUrl);
                                            } else {
                                                setLastTap(now);
                                            }
                                        }}
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
                        </>
                    )}
                </View>


                {/* Order Comments Timeline */}
                <View style={{ gap: 8 }}>
                    <TouchableOpacity 
                        onPress={() => setIsCommentsExpanded(!isCommentsExpanded)}
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                        activeOpacity={0.7}
                    >
                        <Icon source={isCommentsExpanded ? "chevron-down" : "chevron-right"} size={24} color={theme.colors.onSurface} />
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginLeft: 4 }}>Order Notes & Comments</Text>
                        <View style={{ 
                            marginLeft: 8, 
                            backgroundColor: theme.colors.surfaceVariant, 
                            paddingHorizontal: 8, 
                            borderRadius: 10,
                            height: 18,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', lineHeight: 12 }}>{comments.length}</Text>
                        </View>
                    </TouchableOpacity>
                    
                    {isCommentsExpanded && (
                        <>
                            {/* Add/Edit Comment Input */}
                    <View style={{ marginBottom: 4 }}>
                        {editingCommentId && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Editing Comment</Text>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <TextInput
                                placeholder={editingCommentId ? "Update note..." : "Add a note..."}
                                value={newComment}
                                onChangeText={setNewComment}
                                mode="outlined"
                                multiline
                                style={{ backgroundColor: theme.colors.surface, flex: 1, textAlignVertical: 'center' }}
                                contentStyle={{ paddingVertical: 10, textAlignVertical: 'center' }}
                                autoFocus={!!editingCommentId}
                            />
                            <IconButton 
                                icon="paperclip" 
                                size={24} 
                                style={{ marginTop: 8 }}
                                onPress={handleAttachFiles} 
                                iconColor={newCommentAttachments.length > 0 ? theme.colors.primary : theme.colors.outline}
                            />
                        </View>

                        {/* Attachments Preview Bar */}
                        {newCommentAttachments.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                                <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 8, paddingHorizontal: 4 }}>
                                    {newCommentAttachments.map((file: any, idx) => {
                                        const isImg = file.mimeType?.startsWith('image/') || file.uri?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                        return (
                                            <View key={idx} style={{ width: 80, alignItems: 'center' }}>
                                                <View style={{ 
                                                    width: 60, 
                                                    height: 60, 
                                                    borderRadius: 8, 
                                                    backgroundColor: theme.colors.surfaceVariant,
                                                    overflow: 'hidden',
                                                    borderWidth: 1,
                                                    borderColor: theme.colors.outlineVariant,
                                                    position: 'relative'
                                                }}>
                                                    {isImg ? (
                                                        <Image source={{ uri: file.uri }} style={{ width: '100%', height: '100%' }} />
                                                    ) : (
                                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                            <Icon source="file-document-outline" size={30} color={theme.colors.onSurfaceVariant} />
                                                        </View>
                                                    )}
                                                    
                                                    {/* Remove Button */}
                                                    {!isUploadingAttachments && (
                                                        <TouchableOpacity 
                                                            onPress={() => removeAttachedFile(idx)}
                                                            style={{ 
                                                                position: 'absolute', top: 2, right: 2, 
                                                                backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 
                                                            }}
                                                        >
                                                            <IconButton icon="close" size={12} iconColor="white" style={{ margin: 0 }} />
                                                        </TouchableOpacity>
                                                    )}

                                                    {/* Uploading Overlay */}
                                                    {isUploadingAttachments && (
                                                        <View style={{ 
                                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                                                            backgroundColor: 'rgba(255,255,255,0.7)', 
                                                            justifyContent: 'center', alignItems: 'center' 
                                                        }}>
                                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                                        </View>
                                                    )}
                                                </View>
                                                <Text 
                                                    variant="labelSmall" 
                                                    numberOfLines={1} 
                                                    ellipsizeMode="tail" 
                                                    style={{ marginTop: 4, width: '100%', textAlign: 'center', opacity: 0.7 }}
                                                >
                                                    {file.name || 'File'}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, gap: 8 }}>
                            {editingCommentId ? (
                                <>
                                    <Button 
                                        mode="contained-tonal" 
                                        compact 
                                        onPress={() => {
                                            setNewComment('');
                                            setEditingCommentId(null);
                                        }}
                                        style={{ borderRadius: 8 }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        mode="contained" 
                                        onPress={handleAddComment}
                                        disabled={!newComment.trim()}
                                        style={{ borderRadius: 8 }}
                                    >
                                        Update
                                    </Button>
                                </>
                            ) : (
                                <Button 
                                    mode="contained" 
                                    onPress={handleAddComment}
                                    disabled={(!newComment.trim() && newCommentAttachments.length === 0) || isUploadingAttachments}
                                    style={{ borderRadius: 8 }}
                                    loading={isUploadingAttachments}
                                >
                                    Post
                                </Button>
                            )}
                        </View>
                    </View>

                    {/* Timeline List */}
                    <View style={{ gap: 6 }}>
                        {comments.map((comment, index) => {
                            const date = new Date(comment.createdAt);
                            const isValidDate = !isNaN(date.getTime());
                            
                            return (
                                <View key={comment.id || index} style={{ 
                                    backgroundColor: theme.colors.elevation.level1, 
                                    paddingLeft: 8, 
                                    borderRadius: 14,
                                    borderBottomLeftRadius: 4,
                                    gap: 1
                                }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text variant="labelLarge" style={{ opacity: 0.5, paddingTop:2, paddingBottom:2 }}>
                                            {isValidDate ? date.toLocaleString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : 'Recently'}
                                        </Text>
                                        <View style={{ flexDirection: 'row' }}>
                                            <IconButton 
                                                icon="pencil-outline" 
                                                size={24} 
                                                onPress={() => startEditComment(comment)} 
                                                style={{ margin: 0 }}
                                            />
                                            <IconButton 
                                                icon="trash-can-outline" 
                                                size={24} 
                                                iconColor={theme.colors.error}
                                                onPress={() => handleDeleteComment(comment.id!)} 
                                                style={{ margin: 0 }}
                                            />
                                        </View>
                                    </View>
                                    <Text style={{marginBottom:4}} variant="bodyMedium">{comment.content}</Text>
                                    
                                    {Array.isArray(comment.attachments) && comment.attachments.length > 0 && (
                                        <ScrollableImageRow 
                                            attachments={comment.attachments} 
                                            onPreview={(url) => setPreviewImage(url)} 
                                            theme={theme}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </>
            )}
        </View>


                <View style={{ height: 40 }} />
            </ScrollView>
            <ImagePreviewModal 
                visible={!!previewImage} 
                onDismiss={() => setPreviewImage(null)} 
                imageUrl={previewImage || ''} 
                title="Image Preview" 
            />
        </Surface>
    );
}

// Helper component for horizontal scrollable image row with chevrons
function ScrollableImageRow({ attachments, onPreview, theme }: { attachments: any[], onPreview: (url: string) => void, theme: any }) {
    const scrollRef = React.useRef<ScrollView>(null);
    const [scrollPos, setScrollPos] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    const scroll = (direction: 'left' | 'right') => {
        const offset = direction === 'left' ? -150 : 150;
        scrollRef.current?.scrollTo({ x: scrollPos + offset, animated: true });
    };

    const showLeft = scrollPos > 20;
    const showRight = scrollPos + containerWidth < contentWidth - 20;

    return (
        <View style={{ position: 'relative', marginTop: 8, paddingBottom: 8 }}>
            {showLeft && (
                <View style={{ position: 'absolute', left: -4, top: 35, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 15 }}>
                    <IconButton icon="chevron-left" size={20} style={{ margin: 0 }} onPress={() => scroll('left')} />
                </View>
            )}
            
            <ScrollView 
                ref={scrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => setScrollPos(e.nativeEvent.contentOffset.x)}
                onContentSizeChange={(w) => setContentWidth(w)}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                scrollEventThrottle={16}
            >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {attachments.map((att: any) => {
                        const downloadUrl = `${process.env.EXPO_PUBLIC_SEARCH_API_URL}${API_ROUTES.ATTACHMENTS.DOWNLOAD(att.key)}`;
                        const isImg = att.contentType?.startsWith('image/') || att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        
                        return (
                        <View key={att.id} style={{ alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => {
                                if (isImg) onPreview(downloadUrl);
                                else Linking.openURL(downloadUrl);
                            }}>
                                <View style={{ 
                                    width: 100, 
                                    height: 100, 
                                    borderRadius: 8, 
                                    backgroundColor: theme.colors.surfaceVariant,
                                    overflow: 'hidden',
                                    borderWidth: 1,
                                    borderColor: theme.colors.outlineVariant,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    {isImg ? (
                                        <Image source={{ uri: downloadUrl }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <Icon source="file-document-outline" size={40} color={theme.colors.onSurfaceVariant} />
                                    )}
                                </View>
                            </TouchableOpacity>
                            <Text variant="labelSmall" style={{ opacity: 0.5, marginTop: 4, maxWidth: 80 }} numberOfLines={1}>
                                {att.name || 'File'}
                            </Text>
                        </View>
                        );
                    })}
                </View>
            </ScrollView>

            {showRight && (
                <View style={{ position: 'absolute', right: -4, top: 35, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 15 }}>
                    <IconButton icon="chevron-right" size={20} style={{ margin: 0 }} onPress={() => scroll('right')} />
                </View>
            )}
        </View>
    );
}

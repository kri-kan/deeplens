import React, { useState, useEffect } from 'react';
import {
  Pressable,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import * as ImagePicker from 'expo-image-picker';
import {
  LuImage,
  LuBuilding2,
  LuTrash2,
  LuCamera,
  LuArrowLeft,
  LuChevronDown,
  LuEye,
  LuShare2,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { getSearchApiUrl } from '@/utils/api-config';
import { DropdownField } from '@/components/tamagui-ui/atoms/DropdownField';
import { CompactField } from '@/components/tamagui-ui/atoms/CompactField';
import { ConfirmDialog } from '@/components/tamagui-ui/molecules/ConfirmDialog';
import { QuickPickerSheet } from '@/components/tamagui-ui/molecules/QuickPickerSheet';
import { VendorPickerSheet } from '@/components/tamagui-ui/molecules/VendorPickerSheet';
import { ImageViewerModal } from '@/components/tamagui-ui/molecules/ImageViewerModal';
import { shareImageUri } from '@/utils/shareImage';
import { uriToBlob, compressImageToWebP } from '@/utils/media-helpers';
import {
  CatalogMediaPickerModal,
  CatalogMediaSelection,
  resolveProductTitleFromSku,
} from '@/components/tamagui-ui/molecules/CatalogMediaPickerModal';
import { OrderItem } from './ProductListSection';

export interface ProductEditSheetProps {
  visible: boolean;
  item: OrderItem | null;
  isCod?: boolean;
  lockedVendorNames?: string[];
  readOnly?: boolean;
  onSaveItem: (item: OrderItem) => void;
  onDeleteItem?: (item: OrderItem) => void;
  onClose: () => void;
}

export function ProductEditSheet({
  visible,
  item,
  isCod = false,
  lockedVendorNames = [],
  readOnly = false,
  onSaveItem,
  onDeleteItem,
  onClose,
}: ProductEditSheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<OrderItem | null>(item);
  const [linkedCatalogSku, setLinkedCatalogSku] = useState<string>(
    item?.catalogImageUrl ? (item.productId?.trim() || '') : ''
  );
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [catalogPickerVisible, setCatalogPickerVisible] = useState(false);
  const [vendorPickerVisible, setVendorPickerVisible] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ uri: string; title?: string } | null>(null);

  // Internal Quick Picker for Size & Quantity dropdowns
  const [sheetPickerState, setSheetPickerState] = useState<{
    visible: boolean;
    type: 'size' | 'qty';
    currentValue: string;
  }>({
    visible: false,
    type: 'size',
    currentValue: '',
  });

  const [pendingPhotoFile, setPendingPhotoFile] = useState<{
    uri: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(item);
    setLinkedCatalogSku(item?.catalogImageUrl ? (item.productId?.trim() || '') : '');
    setPendingPhotoFile(null);
    setIsPhotoRemoved(false);
    setIsSaving(false);
  }, [item]);

  if (!visible || !form) return null;

  const updateField = (field: keyof OrderItem, val: any) => {
    setForm((prev) => (prev ? { ...prev, [field]: val } : prev));
  };

  const handlePickPhoto = async () => {
    try {
      setIsPickingImage(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Media library access is required to attach product photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const rawFileName = asset.fileName || asset.uri.split('/').pop() || `order_item_${Date.now()}.jpg`;
        const rawExt = rawFileName.split('.').pop()?.toLowerCase() || 'jpg';
        const rawMimeType = asset.mimeType || (rawExt === 'png' ? 'image/png' : 'image/jpeg');

        // Stage photo safely in local cache; attempt WebP compression but gracefully fall back to original URI if manipulator fails
        let stagedUri = asset.uri;
        let stagedFileName = rawFileName;
        let stagedMimeType = rawMimeType;

        try {
          const compressed = await compressImageToWebP(asset.uri, rawFileName, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8,
            originalWidth: asset.width,
            originalHeight: asset.height,
          });
          if (compressed?.uri) {
            stagedUri = compressed.uri;
            stagedFileName = compressed.fileName;
            stagedMimeType = compressed.mimeType;
          }
        } catch (compressionErr) {
          console.warn('[handlePickPhoto] Compression fallback to original asset:', compressionErr);
        }

        // Stage in local state and render preview immediately on the tile from local cache URI
        // Zero network calls or MinIO uploads occur until user explicitly saves
        setPendingPhotoFile({
          uri: stagedUri,
          fileName: stagedFileName,
          mimeType: stagedMimeType,
        });
        setIsPhotoRemoved(false);

        setForm((prev) => (prev ? {
          ...prev,
          photoUri: stagedUri,
          image: stagedUri,
        } : prev));
      }
    } catch (err: any) {
      console.warn('Failed to pick image:', err);
      Alert.alert('Image Selection Failed', err?.message || 'Could not process selected image.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleRemoveUploadedPhoto = () => {
    if (!form) return;
    setPendingPhotoFile(null);
    setIsPhotoRemoved(true);

    // Staged removal: do NOT delete from MinIO immediately; deletion occurs only upon explicit save
    setForm((prev) => (prev ? {
      ...prev,
      photoUri: undefined,
      image: prev.catalogImageUrl || undefined,
      attachmentId: undefined,
      storagePath: undefined,
    } : prev));
  };

  const handleCancelOrClose = () => {
    // Staged photo / removal was only kept in local cache; discarding requires zero backend network calls
    setPendingPhotoFile(null);
    setIsPhotoRemoved(false);
    onClose();
  };

  const handleOpenSheetPicker = (type: 'size' | 'qty') => {
    setSheetPickerState({
      visible: true,
      type,
      currentValue: type === 'size' ? (form.size || 'Free Size') : String(form.quantity || 1),
    });
  };

  const handleSelectSheetOption = (val: string) => {
    if (sheetPickerState.type === 'size') {
      updateField('size', val);
    } else {
      updateField('quantity', parseInt(val, 10) || 1);
    }
  };

  const handleSelectCatalogMedia = (selection: CatalogMediaSelection) => {
    const newSku = (selection.product.productCode || form?.productId || '').trim();
    setLinkedCatalogSku(newSku);

    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        productId: newSku || prev.productId,
        title: prev.title ? prev.title : selection.product.title,
        costPerPiece:
          prev.costPerPiece && prev.costPerPiece > 0
            ? prev.costPerPiece
            : (selection.product.vendorPrice || prev.costPerPiece),
        catalogImageUrl: selection.imageUrl,
        catalogImageColor: selection.mediaItem.color || prev.catalogImageColor,
        selectedMediaId: selection.mediaItem.id,
        image: prev.photoUri ? prev.photoUri : (prev.image === prev.catalogImageUrl ? undefined : prev.image),
      };
    });
  };

  const handleSkuBlur = async () => {
    if (!form) return;
    if (!form.title || !form.title.trim()) {
      const resolvedTitle = await resolveProductTitleFromSku(form.productId);
      if (resolvedTitle) {
        updateField('title', resolvedTitle);
      }
    }
  };

  const cleanupOldAttachment = async (
    oldItem?: OrderItem | null,
    newAttachmentId?: string,
    newStoragePath?: string
  ) => {
    if (!oldItem) return;

    const oldAttId = oldItem.attachmentId;
    const oldStoragePath = oldItem.storagePath;
    const oldPhoto = oldItem.photoUri || (oldItem.image && oldItem.image !== oldItem.catalogImageUrl ? oldItem.image : undefined);

    const deletePromises: Promise<any>[] = [];

    if (oldAttId && oldAttId !== newAttachmentId) {
      deletePromises.push(
        searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE(oldAttId)).catch((err) => {
          console.warn(`[ProductEditSheet] Failed to delete prior attachment by id (${oldAttId}):`, err);
        })
      );
    }

    if (oldStoragePath && oldStoragePath !== newStoragePath) {
      deletePromises.push(
        searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(oldStoragePath)).catch((err) => {
          console.warn(`[ProductEditSheet] Failed to delete prior attachment by path (${oldStoragePath}):`, err);
        })
      );
    }

    // Fallback: extract path or id from old photo URL if neither id nor storagePath was directly set
    if (!oldAttId && !oldStoragePath && oldPhoto) {
      if (oldPhoto.includes('/api/v1/Attachment/download?path=')) {
        const match = oldPhoto.match(/[?&]path=([^&]+)/);
        if (match && match[1]) {
          const decoded = decodeURIComponent(match[1]);
          if (decoded !== newStoragePath) {
            deletePromises.push(
              searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(decoded)).catch(console.warn)
            );
          }
        }
      } else if (oldPhoto.includes('/api/v1/Attachment/') && !oldPhoto.includes('download')) {
        const parts = oldPhoto.split('/');
        const possibleId = parts[parts.length - 1]?.split('?')[0];
        if (possibleId && possibleId !== newAttachmentId && possibleId.length > 20) {
          deletePromises.push(
            searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE(possibleId)).catch(console.warn)
          );
        }
      } else if (oldPhoto.includes('order/') || oldPhoto.includes('reference/')) {
        deletePromises.push(
          searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(oldPhoto)).catch(console.warn)
        );
      }
    }

    if (deletePromises.length > 0) {
      await Promise.allSettled(deletePromises);
    }
  };

  const performSave = async (baseItem: OrderItem) => {
    let itemToPersist = { ...baseItem };

    // 1. If a new image was staged in cache, upload it to MinIO upon saving, then hard delete old attachment
    if (pendingPhotoFile) {
      try {
        setIsSaving(true);
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const blob = await uriToBlob(pendingPhotoFile.uri, pendingPhotoFile.mimeType);
          formData.append('file', blob, pendingPhotoFile.fileName);
        } else {
          formData.append('file', {
            uri: pendingPhotoFile.uri,
            name: pendingPhotoFile.fileName,
            type: pendingPhotoFile.mimeType,
          } as any);
        }

        const uploadRes = await searchApiClient.postFormData<{
          id: string;
          fileName: string;
          status: string;
          storagePath?: string;
          url?: string;
        }>(`${API_ROUTES.ATTACHMENTS.UPLOAD}?entityType=order_item&tag=reference`, formData);

        const downloadPath = uploadRes.url || (uploadRes.storagePath ? API_ROUTES.ATTACHMENTS.DOWNLOAD(uploadRes.storagePath) : '');
        const fullImageUrl = downloadPath.startsWith('http') 
          ? downloadPath 
          : `${getSearchApiUrl()}${downloadPath}`;

        // Hard-delete the old attachment from MinIO/database and replace with the new one
        await cleanupOldAttachment(item, uploadRes.id, uploadRes.storagePath);

        itemToPersist = {
          ...itemToPersist,
          photoUri: fullImageUrl,
          image: fullImageUrl,
          attachmentId: uploadRes.id,
          storagePath: uploadRes.storagePath,
        };
      } catch (err: any) {
        console.error('Failed to upload image during save:', err);
        Alert.alert('Save Failed', err?.message || 'Could not upload photo to server.');
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    } else if (isPhotoRemoved) {
      // 2. If photo was marked for removal, hard delete the old attachment from MinIO upon saving
      try {
        setIsSaving(true);
        await cleanupOldAttachment(item);
        itemToPersist = {
          ...itemToPersist,
          photoUri: undefined,
          image: baseItem.catalogImageUrl || undefined,
          attachmentId: undefined,
          storagePath: undefined,
        };
      } catch (err: any) {
        console.warn('Failed to clean up removed attachment on save:', err);
      } finally {
        setIsSaving(false);
      }
    }

    onSaveItem(itemToPersist);
    setPendingPhotoFile(null);
    setIsPhotoRemoved(false);
    onClose();
  };

  const handleSave = async () => {
    if (!form || isSaving) return;
    const currentSku = (form.productId || '').trim();

    const origV = (item?.vendor || '').trim();
    const origKey = (!origV || origV.toLowerCase() === 'unassigned' || origV.toLowerCase() === 'none') ? 'Unassigned' : origV;
    const newV = (form.vendor || '').trim();
    const newKey = (!newV || newV.toLowerCase() === 'unassigned' || newV.toLowerCase() === 'none') ? 'Unassigned' : newV;

    if (origKey !== newKey && lockedVendorNames.includes(newKey)) {
      Alert.alert(
        'Package Locked',
        `Cannot assign items to package "${newKey}". It is already locked (shipping label generated or reached placed/delivered).`
      );
      return;
    }

    // SKU Unlink Warning check
    if (Boolean(form.catalogImageUrl) && Boolean(linkedCatalogSku) && currentSku !== linkedCatalogSku) {
      setShowUnlinkConfirm(true);
      return;
    }

    await performSave(form);
  };

  const handleConfirmUnlinkAndSave = async () => {
    if (!form || isSaving) return;
    setShowUnlinkConfirm(false);

    const unlinkedItem: OrderItem = {
      ...form,
      catalogImageUrl: undefined,
      catalogImageColor: undefined,
      selectedMediaId: undefined,
      image: form.photoUri || (form.image === form.catalogImageUrl ? undefined : form.image),
    };

    setLinkedCatalogSku('');
    await performSave(unlinkedItem);
  };

  const codCharge = isCod ? (form.codChargePerPiece ?? 50) : 0;
  const grossTotal = (form.quantity || 1) * ((form.costPerPiece || 0) + codCharge);
  const advancePaid = isCod ? (form.amountPaid || 0) : 0;
  const calculatedTotal = Math.max(0, grossTotal - advancePaid);

  const screenTitle = readOnly
    ? 'Line Item Details (Locked)'
    : (item?.title || item?.productId || item?.id)
    ? 'Edit Line Item'
    : 'New Line Item';

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancelOrClose}
        statusBarTranslucent
      >
        <YStack flex={1} backgroundColor={tokens.background}>
          {/* ── Top Navigation Bar ── */}
          <YStack
            paddingTop={Platform.OS === 'android' ? Math.max(insets.top, 12) : insets.top}
            backgroundColor={tokens.surface}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
            <XStack
              height={52}
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={16}
            >
              {/* Back Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                accessibilityHint="Discard changes and go back"
                onPress={handleCancelOrClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 70,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <LuArrowLeft size={20} color={tokens.text} />
                <Text fontSize={15} fontWeight="600" color={tokens.text}>
                  Back
                </Text>
              </Pressable>

              {/* Screen Title */}
              <Text
                fontSize={16}
                fontWeight="700"
                color={tokens.text}
                textAlign="center"
                numberOfLines={1}
                flex={1}
              >
                {screenTitle}
              </Text>

              {/* Top Save Button (hidden when readOnly) */}
              <XStack minWidth={70} justifyContent="flex-end">
                {!readOnly && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save line item changes"
                    onPress={handleSave}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: tokens.radius.sm,
                      backgroundColor: tokens.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text fontSize={13} fontWeight="700" color={tokens.accentForeground}>
                      Save
                    </Text>
                  </Pressable>
                )}
              </XStack>
            </XStack>
          </YStack>

          {/* ── Scrollable Form Body ── */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 24,
                gap: 16,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Top Image Tiles (Square Containers) ── */}
              {(() => {
                const uploadedPhotoUri = form.photoUri || (form.image && form.image !== form.catalogImageUrl ? form.image : undefined);
                return (
                  <XStack gap={10}>
                    {/* Tile 1: Uploaded Photo */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Upload photo for this product"
                      style={{ flex: 1 }}
                      onPress={readOnly ? undefined : handlePickPhoto}
                      disabled={readOnly || isPickingImage}
                    >
                      <YStack
                        width="100%"
                        aspectRatio={1}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={form.imageColor || '#f5ebe0'}
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                        borderWidth={1}
                        borderColor={tokens.border}
                        position="relative"
                      >
                        {uploadedPhotoUri ? (
                          <>
                            <Image
                              source={{ uri: uploadedPhotoUri }}
                              style={{ width: '100%', height: '100%', position: 'absolute' }}
                              resizeMode="cover"
                            />
                            {/* Top-Left Eye (Preview) & Top-Right Share */}
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Preview uploaded photo"
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                setPreviewImage({
                                  uri: uploadedPhotoUri,
                                  title: form.title || form.productId || 'Uploaded Photo',
                                });
                              }}
                              style={({ pressed }) => ({
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                zIndex: 10,
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: 'rgba(0, 0, 0, 0.58)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: pressed ? 0.75 : 1,
                              })}
                            >
                              <LuEye size={17} color="#ffffff" />
                            </Pressable>

                            <XStack
                              position="absolute"
                              top={8}
                              right={8}
                              zIndex={10}
                              gap={6}
                              alignItems="center"
                            >
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Share uploaded photo"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  shareImageUri(uploadedPhotoUri, form.title || form.productId || 'Uploaded Photo');
                                }}
                                style={({ pressed }) => ({
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: 'rgba(0, 0, 0, 0.58)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: pressed ? 0.75 : 1,
                                })}
                              >
                                <LuShare2 size={16} color="#ffffff" />
                              </Pressable>

                              {!readOnly && (
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel="Remove uploaded photo"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  onPress={(e) => {
                                    e.stopPropagation?.();
                                    handleRemoveUploadedPhoto();
                                  }}
                                  style={({ pressed }) => ({
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: 'rgba(0, 0, 0, 0.58)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: pressed ? 0.75 : 1,
                                  })}
                                >
                                  <LuTrash2 size={16} color="#ff6b6b" />
                                </Pressable>
                              )}
                            </XStack>
                          </>
                        ) : null}

                        {isPickingImage ? (
                          <YStack
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            backgroundColor="rgba(0,0,0,0.3)"
                            alignItems="center"
                            justifyContent="center"
                            zIndex={2}
                          >
                            <ActivityIndicator size="small" color="#fff" />
                          </YStack>
                        ) : !uploadedPhotoUri ? (
                          <YStack alignItems="center" justifyContent="center" gap={6} paddingBottom={14}>
                            <LuCamera size={26} color={tokens.textMuted} />
                            <Text fontSize={10} fontWeight="600" color={tokens.textMuted}>
                              {readOnly ? 'No Photo' : 'Tap to Choose'}
                            </Text>
                          </YStack>
                        ) : null}

                        <YStack
                          position="absolute"
                          bottom={0}
                          left={0}
                          right={0}
                          paddingVertical={6}
                          backgroundColor={pendingPhotoFile ? 'rgba(37, 99, 235, 0.88)' : 'rgba(0, 0, 0, 0.65)'}
                          alignItems="center"
                          zIndex={3}
                        >
                          <Text fontSize={10} fontWeight="700" color="#fff">
                            {readOnly ? 'Uploaded Photo' : pendingPhotoFile ? 'Staged • Save to Apply' : uploadedPhotoUri ? 'Change Photo' : 'Uploaded Photo'}
                          </Text>
                        </YStack>
                      </YStack>
                    </Pressable>

                {/* Tile 2: Linked Product Image / Catalog PDP Media */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select photo from Catalog PDP gallery"
                  style={{ flex: 1 }}
                  onPress={readOnly ? undefined : () => setCatalogPickerVisible(true)}
                  disabled={readOnly}
                >
                  <YStack
                    width="100%"
                    aspectRatio={1}
                    borderRadius={tokens.radius.sm}
                    backgroundColor={form.catalogImageUrl ? '#fff' : tokens.surfaceRaised}
                    alignItems="center"
                    justifyContent="center"
                    overflow="hidden"
                    borderWidth={1.5}
                    borderColor={form.catalogImageUrl || form.productId ? tokens.accent : tokens.border}
                    borderStyle={form.catalogImageUrl || form.productId ? 'solid' : 'dashed'}
                    position="relative"
                  >
                    {form.catalogImageUrl ? (
                      <>
                        <Image
                          source={{ uri: form.catalogImageUrl }}
                          style={{ width: '100%', height: '100%', position: 'absolute' }}
                          resizeMode="cover"
                        />
                        {/* Top-Left Eye (Preview) & Top-Right Share */}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Preview catalog photo"
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            setPreviewImage({
                              uri: form.catalogImageUrl!,
                              title: form.productId || 'Catalog PDP Media',
                            });
                          }}
                          style={({ pressed }) => ({
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 10,
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: 'rgba(0, 0, 0, 0.58)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: pressed ? 0.75 : 1,
                          })}
                        >
                          <LuEye size={17} color="#ffffff" />
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Share catalog photo"
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            shareImageUri(form.catalogImageUrl, form.productId || 'Catalog PDP Media');
                          }}
                          style={({ pressed }) => ({
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 10,
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: 'rgba(0, 0, 0, 0.58)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: pressed ? 0.75 : 1,
                          })}
                        >
                          <LuShare2 size={16} color="#ffffff" />
                        </Pressable>
                        <YStack
                          position="absolute"
                          bottom={0}
                          left={0}
                          right={0}
                          paddingVertical={6}
                          backgroundColor="rgba(0,0,0,0.65)"
                          alignItems="center"
                          zIndex={3}
                        >
                          <Text fontSize={10} fontWeight="700" color="#fff">
                            {form.productId || 'Catalog Image'}
                          </Text>
                        </YStack>
                      </>
                    ) : form.productId ? (
                      <YStack width="100%" height="100%" justifyContent="center" alignItems="center" padding={6} gap={4}>
                        <LuImage size={26} color={tokens.accent} />
                        <Text fontSize={11} fontWeight="700" color={tokens.accent} textAlign="center" numberOfLines={1}>
                          {form.productId}
                        </Text>
                        <Text fontSize={10} color={tokens.textMuted} textAlign="center">
                          Tap to pick photo
                        </Text>
                      </YStack>
                    ) : (
                      <YStack alignItems="center" gap={4}>
                        <LuImage size={26} color={tokens.accent} />
                        <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                          Catalog PDP Media
                        </Text>
                        <Text fontSize={10} color={tokens.textMuted} textAlign="center">
                          Pick from catalog
                        </Text>
                      </YStack>
                    )}
                  </YStack>
                </Pressable>
              </XStack>
            );
          })()}

              {/* Form Fields — compact underline style */}
              <YStack gap={10}>
                {/* Row 1: Product Title / Name */}
                <CompactField
                  label="Product Title / Description"
                  value={form.title}
                  editable={!readOnly}
                  onChange={(v) => updateField('title', v)}
                  placeholder="e.g. Pure Zari Banarasi Saree"
                />

                {/* Row 2: Product ID / SKU, Size Dropdown & Quantity Dropdown (3 Columns) */}
                <XStack gap={10}>
                  <YStack flex={1.2}>
                    <CompactField
                      label="Product ID / SKU"
                      value={form.productId}
                      editable={!readOnly}
                      onChange={(v) => updateField('productId', v)}
                      onBlur={handleSkuBlur}
                      onSubmitEditing={handleSkuBlur}
                      placeholder="PRD-84920"
                    />
                  </YStack>
                  <YStack flex={1}>
                    <DropdownField
                      label="Size"
                      value={form.size || 'Free Size'}
                      disabled={readOnly}
                      onPress={() => handleOpenSheetPicker('size')}
                    />
                  </YStack>
                  <YStack flex={0.7}>
                    <DropdownField
                      label="Qty"
                      value={String(form.quantity || 1)}
                      disabled={readOnly}
                      onPress={() => handleOpenSheetPicker('qty')}
                    />
                  </YStack>
                </XStack>

                {/* Row 3: Pricing */}
                {isCod ? (
                  /* COD Order: 3 Columns (Price / Pc, COD Charges / Pc & Advance Paid) */
                  <XStack gap={10}>
                    <YStack flex={1}>
                      <CompactField
                        label="Price / Pc (₹)"
                        value={String(form.costPerPiece)}
                        editable={!readOnly}
                        onChange={(v) => {
                          const digits = v.replace(/[^0-9]/g, '').slice(0, 5);
                          updateField('costPerPiece', digits ? parseInt(digits, 10) : 0);
                        }}
                        placeholder="1299"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </YStack>

                    <YStack flex={0.9}>
                      <CompactField
                        label="COD / Pc (₹)"
                        value={String(form.codChargePerPiece ?? 50)}
                        editable={!readOnly}
                        onChange={(v) => {
                          const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
                          updateField('codChargePerPiece', digits ? parseInt(digits, 10) : 0);
                        }}
                        placeholder="50"
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </YStack>

                    <YStack flex={1.1}>
                      <CompactField
                        label="Advance Paid (₹)"
                        value={String(form.amountPaid ?? 0)}
                        editable={!readOnly}
                        onChange={(v) => {
                          const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
                          updateField('amountPaid', digits ? parseInt(digits, 10) : 0);
                        }}
                        placeholder="0"
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </YStack>
                  </XStack>
                ) : (
                  /* Prepaid Order: Price / Pc is half-width aligned to the right; left is empty spacer */
                  <XStack gap={10}>
                    <YStack flex={1} />
                    <YStack flex={1}>
                      <CompactField
                        label="Price / Pc (₹)"
                        value={String(form.costPerPiece)}
                        editable={!readOnly}
                        onChange={(v) => {
                          const digits = v.replace(/[^0-9]/g, '').slice(0, 5);
                          updateField('costPerPiece', digits ? parseInt(digits, 10) : 0);
                        }}
                        placeholder="1299"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </YStack>
                  </XStack>
                )}

                {/* Row 4: Dedicated Full-Width Interactive Dropdown for Vendor Assignment */}
                <Pressable
                  accessibilityRole="combobox"
                  accessibilityLabel={`Vendor Assignment: ${form.vendor || 'Select Vendor'}`}
                  accessibilityHint="Tap to choose vendor"
                  accessibilityState={{ disabled: readOnly }}
                  disabled={readOnly}
                  onPress={readOnly ? undefined : () => setVendorPickerVisible(true)}
                  hitSlop={4}
                >
                  <YStack
                    borderBottomWidth={1}
                    borderBottomColor={tokens.border}
                    paddingVertical={3}
                    gap={1}
                  >
                    <Text fontSize={9} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.4}>
                      Vendor Assignment
                    </Text>
                    <XStack alignItems="center" justifyContent="space-between" height={24}>
                      <XStack alignItems="center" gap={6} flex={1}>
                        <LuBuilding2 size={13} color={tokens.textMuted} />
                        <Text
                          fontSize={13}
                          fontWeight="700"
                          color={form.vendor ? (readOnly ? tokens.textSecondary : tokens.text) : tokens.textMuted}
                          numberOfLines={1}
                        >
                          {form.vendor || 'Select Vendor (e.g. In-House)'}
                        </Text>
                      </XStack>
                      {!readOnly && <LuChevronDown size={14} color={tokens.textMuted} />}
                    </XStack>
                  </YStack>
                </Pressable>

                {/* Summary pill */}
                <XStack
                  backgroundColor={tokens.surfaceRaised}
                  borderRadius={tokens.radius.sm}
                  paddingHorizontal={12}
                  paddingVertical={8}
                  justifyContent="space-between"
                  alignItems="center"
                  marginTop={6}
                >
                  <Text fontSize={12} color={tokens.textMuted}>
                    Line Total ({form.quantity || 1} × ₹{(form.costPerPiece || 0) + codCharge}{advancePaid > 0 ? ` - ₹${advancePaid}` : ''})
                  </Text>
                  <Text fontSize={15} fontWeight="800" color={tokens.text}>
                    ₹{calculatedTotal.toLocaleString('en-IN')}
                  </Text>
                </XStack>
              </YStack>
            </ScrollView>

            {/* ── Sticky Bottom Footer ── */}
            <YStack
              borderTopWidth={1}
              borderTopColor={tokens.border}
              backgroundColor={tokens.surface}
              paddingHorizontal={16}
              paddingTop={12}
              paddingBottom={Math.max(insets.bottom, 12)}
              shadowColor="#000"
              shadowOpacity={0.08}
              shadowRadius={8}
              shadowOffset={{ width: 0, height: -3 }}
            >
              <XStack gap={10}>
                {readOnly ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close line item details"
                    onPress={onClose}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 46,
                      borderRadius: tokens.radius.sm,
                      backgroundColor: pressed ? `${tokens.accent}D0` : tokens.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    <Text fontSize={14} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.4}>
                      CLOSE
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    {onDeleteItem && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete this item from order"
                        onPress={() => {
                          onDeleteItem(form);
                          onClose();
                        }}
                        style={({ pressed }) => ({
                          flex: 1,
                          height: 46,
                          borderRadius: tokens.radius.sm,
                          borderWidth: 1,
                          borderColor: tokens.error || '#EF4444',
                          backgroundColor: tokens.errorSubtle || 'rgba(239, 68, 68, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.75 : 1,
                        })}
                      >
                        <XStack alignItems="center" gap={6}>
                          <LuTrash2 size={16} color={tokens.error || '#EF4444'} />
                          <Text fontSize={13} fontWeight="800" color={tokens.error || '#EF4444'} letterSpacing={0.3}>
                            DELETE ITEM
                          </Text>
                        </XStack>
                      </Pressable>
                    )}

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Save line item changes"
                      onPress={handleSave}
                      disabled={isSaving}
                      style={({ pressed }) => ({
                        flex: onDeleteItem ? 1.3 : 1,
                        height: 46,
                        borderRadius: tokens.radius.sm,
                        backgroundColor: tokens.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isSaving ? 0.6 : (pressed ? 0.85 : 1),
                      })}
                    >
                      {isSaving ? (
                        <XStack alignItems="center" gap={6}>
                          <ActivityIndicator size="small" color={tokens.accentForeground} />
                          <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.4}>
                            SAVING...
                          </Text>
                        </XStack>
                      ) : (
                        <Text fontSize={14} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.4}>
                          SAVE ITEM
                        </Text>
                      )}
                    </Pressable>
                  </>
                )}
              </XStack>
            </YStack>
          </KeyboardAvoidingView>
        </YStack>
      </Modal>

      {/* Nested QuickPickerSheet for Size / Quantity inside the Edit Screen */}
      <QuickPickerSheet
        visible={sheetPickerState.visible}
        type={sheetPickerState.type}
        selected={sheetPickerState.currentValue}
        onSelect={handleSelectSheetOption}
        onClose={() => setSheetPickerState((prev) => ({ ...prev, visible: false }))}
      />

      {/* Nested VendorPickerSheet for Vendor Assignment */}
      <VendorPickerSheet
        visible={vendorPickerVisible}
        selectedVendor={form.vendor}
        lockedVendors={lockedVendorNames}
        originalVendor={item?.vendor}
        onSelect={(vendorName) => updateField('vendor', vendorName)}
        onClose={() => setVendorPickerVisible(false)}
      />

      {/* Catalog PDP Media Picker Modal for Tile 2 */}
      <CatalogMediaPickerModal
        visible={catalogPickerVisible}
        initialSku={form.productId}
        onSelect={handleSelectCatalogMedia}
        onClose={() => setCatalogPickerVisible(false)}
      />

      {/* SKU Unlink Confirmation Dialog */}
      <ConfirmDialog
        visible={showUnlinkConfirm}
        title="Unlink Product Image?"
        message={`The SKU was changed from '${linkedCatalogSku}' to '${form.productId}'. Saving will unlink the catalog product image as they are different now. Do you want to proceed?`}
        confirmLabel="Proceed"
        cancelLabel="Cancel"
        intent="attention"
        onConfirm={handleConfirmUnlinkAndSave}
        onCancel={() => setShowUnlinkConfirm(false)}
      />

      {/* Full-Screen Image Preview Modal with Share Intent */}
      <ImageViewerModal
        visible={!!previewImage}
        imageUrl={previewImage?.uri}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}

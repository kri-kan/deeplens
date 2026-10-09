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
  onSaveItem: (item: OrderItem) => void;
  onDeleteItem?: (item: OrderItem) => void;
  onClose: () => void;
}

export function ProductEditSheet({
  visible,
  item,
  isCod = false,
  lockedVendorNames = [],
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

  useEffect(() => {
    setForm(item);
    setLinkedCatalogSku(item?.catalogImageUrl ? (item.productId?.trim() || '') : '');
  }, [item]);

  if (!visible || !form) return null;

  const updateField = (field: keyof OrderItem, val: any) => {
    setForm((prev) => (prev ? { ...prev, [field]: val } : prev));
  };

  const handlePickPhoto = async () => {
    try {
      setIsPickingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const fileName = asset.fileName || fileUri.split('/').pop() || `order_item_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

        const formData = new FormData();
        if (Platform.OS === 'web') {
          const res = await fetch(fileUri);
          const blob = await res.blob();
          formData.append('file', blob, fileName);
        } else {
          formData.append('file', {
            uri: fileUri,
            name: fileName,
            type: mimeType,
          } as any);
        }

        // Upload new photo to backend attachment storage
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

        // Hard-delete the old image from the system to prevent orphaned data
        const oldPhotoUri = form.photoUri || (form.image && form.image !== form.catalogImageUrl ? form.image : undefined);
        const oldAttachmentId = form.attachmentId;
        const oldStoragePath = form.storagePath;

        if (oldAttachmentId) {
          try {
            await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE(oldAttachmentId));
            console.log(`[ProductEditSheet] Hard-deleted old attachment by ID: ${oldAttachmentId}`);
          } catch (delErr) {
            console.warn('[ProductEditSheet] Failed to delete old attachment by ID:', delErr);
          }
        } else if (oldStoragePath) {
          try {
            await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(oldStoragePath));
            console.log(`[ProductEditSheet] Hard-deleted old attachment by storagePath: ${oldStoragePath}`);
          } catch (delErr) {
            console.warn('[ProductEditSheet] Failed to delete old attachment by storagePath:', delErr);
          }
        } else if (oldPhotoUri && (oldPhotoUri.includes('/api/v1/Attachment/') || oldPhotoUri.includes('order/'))) {
          try {
            await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(oldPhotoUri));
            console.log(`[ProductEditSheet] Hard-deleted old attachment by photoUri: ${oldPhotoUri}`);
          } catch (delErr) {
            console.warn('[ProductEditSheet] Failed to delete old attachment by photoUri:', delErr);
          }
        }

        setForm((prev) => (prev ? {
          ...prev,
          photoUri: fullImageUrl,
          image: fullImageUrl,
          attachmentId: uploadRes.id,
          storagePath: uploadRes.storagePath,
        } : prev));
      }
    } catch (err: any) {
      console.warn('Failed to pick and upload image:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not upload image to system.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleRemoveUploadedPhoto = async () => {
    if (!form) return;
    const oldPhotoUri = form.photoUri || (form.image && form.image !== form.catalogImageUrl ? form.image : undefined);
    const oldAttachmentId = form.attachmentId;
    const oldStoragePath = form.storagePath;

    if (oldAttachmentId) {
      try {
        await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE(oldAttachmentId));
        console.log(`[ProductEditSheet] Hard-deleted attachment on remove: ${oldAttachmentId}`);
      } catch (err) {
        console.warn('Failed to delete attachment on remove:', err);
      }
    } else if (oldStoragePath) {
      try {
        await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(oldStoragePath));
        console.log(`[ProductEditSheet] Hard-deleted storagePath on remove: ${oldStoragePath}`);
      } catch (err) {
        console.warn('Failed to delete storagePath on remove:', err);
      }
    } else if (oldPhotoUri && (oldPhotoUri.includes('/api/v1/Attachment/') || oldPhotoUri.includes('order/'))) {
      try {
        await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(oldPhotoUri));
        console.log(`[ProductEditSheet] Hard-deleted photoUri on remove: ${oldPhotoUri}`);
      } catch (err) {
        console.warn('Failed to delete photoUri on remove:', err);
      }
    }

    setForm((prev) => (prev ? {
      ...prev,
      photoUri: undefined,
      image: prev.catalogImageUrl || undefined,
      attachmentId: undefined,
      storagePath: undefined,
    } : prev));
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

  const handleSave = () => {
    if (!form) return;
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

    onSaveItem(form);
    onClose();
  };

  const handleConfirmUnlinkAndSave = () => {
    if (!form) return;
    setShowUnlinkConfirm(false);

    const unlinkedItem: OrderItem = {
      ...form,
      catalogImageUrl: undefined,
      catalogImageColor: undefined,
      selectedMediaId: undefined,
      image: form.photoUri || (form.image === form.catalogImageUrl ? undefined : form.image),
    };

    setLinkedCatalogSku('');
    onSaveItem(unlinkedItem);
    onClose();
  };

  const codCharge = isCod ? (form.codChargePerPiece ?? 50) : 0;
  const grossTotal = (form.quantity || 1) * ((form.costPerPiece || 0) + codCharge);
  const advancePaid = isCod ? (form.amountPaid || 0) : 0;
  const calculatedTotal = Math.max(0, grossTotal - advancePaid);

  const screenTitle = (item?.title || item?.productId || item?.id) ? 'Edit Line Item' : 'New Line Item';

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
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
                onPress={onClose}
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

              {/* Top Save Button */}
              <XStack minWidth={70} justifyContent="flex-end">
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
                      onPress={handlePickPhoto}
                      disabled={isPickingImage}
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
                              Tap to Choose
                            </Text>
                          </YStack>
                        ) : null}

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
                            {uploadedPhotoUri ? 'Change Photo' : 'Uploaded Photo'}
                          </Text>
                        </YStack>
                      </YStack>
                    </Pressable>

                {/* Tile 2: Linked Product Image / Catalog PDP Media */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select photo from Catalog PDP gallery"
                  style={{ flex: 1 }}
                  onPress={() => setCatalogPickerVisible(true)}
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
                  onChange={(v) => updateField('title', v)}
                  placeholder="e.g. Pure Zari Banarasi Saree"
                />

                {/* Row 2: Product ID / SKU, Size Dropdown & Quantity Dropdown (3 Columns) */}
                <XStack gap={10}>
                  <YStack flex={1.2}>
                    <CompactField
                      label="Product ID / SKU"
                      value={form.productId}
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
                      onPress={() => handleOpenSheetPicker('size')}
                    />
                  </YStack>
                  <YStack flex={0.7}>
                    <DropdownField
                      label="Qty"
                      value={String(form.quantity || 1)}
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
                  onPress={() => setVendorPickerVisible(true)}
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
                          color={form.vendor ? tokens.text : tokens.textMuted}
                          numberOfLines={1}
                        >
                          {form.vendor || 'Select Vendor (e.g. Varanasi Weavers Ltd)'}
                        </Text>
                      </XStack>
                      <LuChevronDown size={14} color={tokens.textMuted} />
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
                  style={({ pressed }) => ({
                    flex: onDeleteItem ? 1.3 : 1,
                    height: 46,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text fontSize={14} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.4}>
                    SAVE ITEM
                  </Text>
                </Pressable>
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

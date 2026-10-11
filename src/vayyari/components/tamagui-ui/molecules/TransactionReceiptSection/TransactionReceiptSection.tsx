import React, { useState } from 'react';
import { Pressable, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import * as ImagePicker from 'expo-image-picker';
import { LuPlus, LuX, LuReceipt } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { searchApiClient } from '@/api/client';
import { getSearchApiUrl } from '@/utils/api-config';
import { API_ROUTES } from '@/constants/api-routes';
import { uriToBlob, compressImageToWebP } from '@/utils/media-helpers';

export interface TransactionReceiptSectionProps {
  transactionId: string;
  onChangeTransactionId: (val: string) => void;
  receiptUrl: string | null;
  onUploadReceipt: (url: string) => void;
  onRemoveReceipt: () => void;
}

export function TransactionReceiptSection({
  transactionId,
  onChangeTransactionId,
  receiptUrl,
  onUploadReceipt,
  onRemoveReceipt,
}: TransactionReceiptSectionProps) {
  const { tokens } = useTheme();
  const [uploading, setUploading] = useState(false);

  const handlePickAndUploadReceipt = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Media library access is required to upload receipt screenshots.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const asset = result.assets[0];
      const rawFileName = asset.fileName || asset.uri.split('/').pop() || 'receipt.png';

      const compressed = await compressImageToWebP(asset.uri, rawFileName, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        originalWidth: asset.width,
        originalHeight: asset.height,
      });

      const blob = await uriToBlob(compressed.uri, compressed.mimeType);
      const formData = new FormData();
      formData.append('file', blob, compressed.fileName);

      const uploadRes = await searchApiClient.postFormData<{
        id: string;
        fileName: string;
        status: string;
        storagePath?: string;
        url?: string;
      }>(`${API_ROUTES.ATTACHMENTS.UPLOAD}?entityType=order_receipt&tag=receipt`, formData);

      const downloadPath = uploadRes.url || (uploadRes.storagePath ? API_ROUTES.ATTACHMENTS.DOWNLOAD(uploadRes.storagePath) : '');
      const fullImageUrl = downloadPath.startsWith('http')
        ? downloadPath
        : `${getSearchApiUrl()}${downloadPath}`;

      onUploadReceipt(fullImageUrl);
    } catch (err: any) {
      console.error('Receipt upload failed:', err);
      Alert.alert('Upload Error', err?.message || 'Could not upload receipt screenshot.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveReceiptWithHardDelete = async () => {
    if (receiptUrl) {
      try {
        if (receiptUrl.includes('/api/v1/Attachment/')) {
          await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(receiptUrl));
          console.log('[TransactionReceiptSection] Hard-deleted receipt attachment by path:', receiptUrl);
        }
      } catch (err) {
        console.warn('Failed to hard delete receipt attachment:', err);
      }
    }
    onRemoveReceipt();
  };

  return (
    <YStack gap={8}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text
          fontSize={11}
          fontWeight="700"
          color={tokens.textMuted}
          textTransform="uppercase"
          letterSpacing={0.8}
        >
          Payment & Receipt (Optional)
        </Text>
      </XStack>

      <YStack
        backgroundColor={tokens.surface}
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={tokens.radius.md}
        paddingHorizontal={10}
        paddingVertical={10}
        gap={8}
      >
        {/* Transaction ID Input */}
        <YStack gap={4}>
          <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
            Transaction / UTR ID
          </Text>
          <TextInput
            accessibilityLabel="Transaction or UTR ID"
            value={transactionId ?? ''}
            onChangeText={onChangeTransactionId}
            placeholder="e.g. UPI-20240902-892189 or Bank Ref"
            placeholderTextColor={tokens.textMuted}
            style={{
              fontSize: 13,
              color: tokens.text,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: tokens.surfaceRaised,
              borderRadius: tokens.radius.xs,
              borderWidth: 1,
              borderColor: tokens.border,
              outlineStyle: 'none',
            } as any}
          />
        </YStack>

        {/* Receipt Screenshot Upload / Preview */}
        <YStack gap={4}>
          <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
            Receipt Screenshot
          </Text>

          {receiptUrl ? (
            /* Uploaded thumbnail preview */
            <XStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.sm}
              borderWidth={1}
              borderColor={tokens.border}
              padding={8}
              alignItems="center"
              justifyContent="space-between"
            >
              <XStack alignItems="center" gap={8} flex={1}>
                <YStack
                  width={40}
                  height={40}
                  borderRadius={tokens.radius.xs}
                  backgroundColor={tokens.successSubtle}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuReceipt size={18} color={tokens.success} />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                    {receiptUrl.split('/').pop() || 'receipt_screenshot.png'}
                  </Text>
                  <Text fontSize={10} color={tokens.success}>
                    ✓ Receipt Attached
                  </Text>
                </YStack>
              </XStack>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hard delete receipt screenshot"
                onPress={handleRemoveReceiptWithHardDelete}
                hitSlop={8}
              >
                <YStack
                  width={24}
                  height={24}
                  borderRadius={tokens.radius.full}
                  backgroundColor={tokens.surface}
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={1}
                  borderColor={tokens.border}
                >
                  <LuX size={12} color={tokens.textMuted} />
                </YStack>
              </Pressable>
            </XStack>
          ) : (
            /* Dashed Upload Box */
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload transaction receipt screenshot"
              disabled={uploading}
              onPress={handlePickAndUploadReceipt}
            >
              <YStack
                height={56}
                borderRadius={tokens.radius.sm}
                borderWidth={1.5}
                borderColor={tokens.border}
                borderStyle="dashed"
                alignItems="center"
                justifyContent="center"
                backgroundColor={tokens.surfaceRaised}
                gap={3}
                hoverStyle={{ borderColor: tokens.accent }}
              >
                {uploading ? (
                  <XStack alignItems="center" gap={6}>
                    <ActivityIndicator size="small" color={tokens.accent} />
                    <Text fontSize={12} fontWeight="600" color={tokens.accent}>
                      Uploading Receipt…
                    </Text>
                  </XStack>
                ) : (
                  <>
                    <XStack alignItems="center" gap={6}>
                      <LuPlus size={14} color={tokens.accent} />
                      <Text fontSize={12} fontWeight="600" color={tokens.accent}>
                        Attach Receipt Screenshot
                      </Text>
                    </XStack>
                    <Text fontSize={10} color={tokens.textMuted}>
                      PNG, JPG up to 5MB
                    </Text>
                  </>
                )}
              </YStack>
            </Pressable>
          )}
        </YStack>
      </YStack>
    </YStack>
  );
}

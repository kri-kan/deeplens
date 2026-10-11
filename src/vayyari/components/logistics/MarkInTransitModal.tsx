import React, { useState } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import * as ImagePicker from 'expo-image-picker';
import {
  LuTruck,
  LuX,
  LuImage,
  LuCheck,
  LuFileText,
  LuTag,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { LogisticsOrder, MarkInTransitPayload } from '@/types/logistics';
import { logisticsService } from '@/services/logistics.service';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { getSearchApiUrl } from '@/utils/api-config';
import { uriToBlob } from '@/utils/media-helpers';

interface MarkInTransitModalProps {
  visible: boolean;
  onDismiss: () => void;
  order: LogisticsOrder | null;
  onComplete: () => void;
}

const COMMON_COURIERS = [
  'DTDC',
  'ST Courier',
  'India Post',
  'Professional',
  'Trackon',
  'BlueDart',
  'Other',
];

export const MarkInTransitModal: React.FC<MarkInTransitModalProps> = ({
  visible,
  onDismiss,
  order,
  onComplete,
}) => {
  const { tokens } = useTheme();

  const [courierName, setCourierName] = useState<string>('DTDC');
  const [customCourier, setCustomCourier] = useState<string>('');
  const [awbNumber, setAwbNumber] = useState<string>('');
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!visible || !order) return null;

  const effectiveCourier =
    courierName === 'Other' ? customCourier.trim() || 'Custom' : courierName;

  const handlePickAndUploadLabel = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Media library access is required to attach shipping label receipts.'
        );
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

      setUploadingImage(true);
      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = fileUri.split('/').pop() || 'shipping_label.png';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

      const blob = await uriToBlob(fileUri, mimeType);
      const formData = new FormData();
      formData.append('file', blob, fileName);

      try {
        const uploadRes = await searchApiClient.postFormData<{
          id: string;
          fileName: string;
          status: string;
          storagePath?: string;
          url?: string;
        }>(`${API_ROUTES.ATTACHMENTS.UPLOAD}?entityType=shipping_label&tag=label`, formData);

        const downloadPath =
          uploadRes.url ||
          (uploadRes.storagePath ? API_ROUTES.ATTACHMENTS.DOWNLOAD(uploadRes.storagePath) : '');
        const fullImageUrl = downloadPath.startsWith('http')
          ? downloadPath
          : `${getSearchApiUrl()}${downloadPath}`;

        setLabelUrl(fullImageUrl);
      } catch {
        // Fall back to local file URI if server upload fails
        setLabelUrl(fileUri);
      }
    } catch (e) {
      console.warn('[MarkInTransitModal] Image pick error:', e);
      Alert.alert('Upload Error', 'Could not pick or upload shipping label.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      const payload: MarkInTransitPayload = {
        orderId: order.id,
        courierName: effectiveCourier,
        awbNumber: awbNumber.trim() || undefined,
        labelAttachmentUrl: labelUrl || undefined,
        notes: notes.trim() || undefined,
      };

      await logisticsService.markOrderInTransit(order.id, payload);
      onComplete();
      onDismiss();
    } catch (e) {
      console.warn('[MarkInTransitModal] Failed to mark order in transit:', e);
      Alert.alert('Error', 'Failed to update order status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <YStack
          backgroundColor={tokens.surface}
          borderTopLeftRadius={tokens.radius.xl}
          borderTopRightRadius={tokens.radius.xl}
          borderWidth={1}
          borderColor={tokens.border}
          maxHeight="90%"
          width="100%"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: -4 }}
          shadowOpacity={0.15}
          shadowRadius={12}
        >
          {/* Header */}
          <XStack
            paddingHorizontal={18}
            paddingVertical={16}
            alignItems="center"
            justifyContent="space-between"
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
            <XStack alignItems="center" gap={10}>
              <XStack
                width={36}
                height={36}
                borderRadius={tokens.radius.full}
                backgroundColor={`${tokens.accent}14`}
                alignItems="center"
                justifyContent="center"
              >
                <LuTruck size={18} color={tokens.accent} />
              </XStack>
              <YStack gap={1}>
                <Text fontSize={16} fontWeight="800" color={tokens.text}>
                  Mark Order In Transit
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  {order.orderNumber} • {order.customerName}
                </Text>
              </YStack>
            </XStack>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              onPress={onDismiss}
              style={{ cursor: 'pointer', padding: 6 } as any}
            >
              <LuX size={20} color={tokens.textMuted} />
            </Pressable>
          </XStack>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Guide Info */}
            <XStack
              backgroundColor={tokens.surfaceRaised}
              padding={12}
              borderRadius={tokens.radius.md}
              alignItems="center"
              gap={10}
            >
              <LuTag size={16} color={tokens.accent} />
              <Text fontSize={12} color={tokens.text} flex={1}>
                Enter tracking number, attach a shipping label/receipt, or both to confirm dispatch
                for this no-label order.
              </Text>
            </XStack>

            {/* Courier Selection */}
            <YStack gap={8}>
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted} letterSpacing={0.4}>
                COURIER PARTNER
              </Text>
              <XStack flexWrap="wrap" gap={6}>
                {COMMON_COURIERS.map((c) => {
                  const isSelected = courierName === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCourierName(c)}
                      style={{ cursor: 'pointer' } as any}
                    >
                      <XStack
                        paddingHorizontal={12}
                        paddingVertical={6}
                        borderRadius={tokens.radius.full}
                        borderWidth={1}
                        borderColor={isSelected ? tokens.accent : tokens.border}
                        backgroundColor={isSelected ? tokens.accent : tokens.surfaceRaised}
                      >
                        <Text
                          fontSize={12}
                          fontWeight="700"
                          color={isSelected ? '#FFFFFF' : tokens.text}
                        >
                          {c}
                        </Text>
                      </XStack>
                    </Pressable>
                  );
                })}
              </XStack>

              {courierName === 'Other' && (
                <TextInput
                  value={customCourier}
                  onChangeText={setCustomCourier}
                  placeholder="Enter courier name (e.g. Delivery agent name)"
                  placeholderTextColor={tokens.textMuted}
                  style={[
                    styles.textInput,
                    {
                      borderColor: tokens.border,
                      backgroundColor: tokens.surfaceRaised,
                      color: tokens.text,
                    },
                  ]}
                />
              )}
            </YStack>

            {/* Tracking / Docket Number Input */}
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted} letterSpacing={0.4}>
                TRACKING / DOCKET NUMBER
              </Text>
              <TextInput
                value={awbNumber}
                onChangeText={setAwbNumber}
                placeholder="e.g. DTDC123456789"
                placeholderTextColor={tokens.textMuted}
                autoCapitalize="characters"
                style={[
                  styles.textInput,
                  {
                    borderColor: tokens.border,
                    backgroundColor: tokens.surfaceRaised,
                    color: tokens.text,
                  },
                ]}
              />
            </YStack>

            {/* Attach Shipping Label / Slip */}
            <YStack gap={8}>
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted} letterSpacing={0.4}>
                SHIPPING LABEL / RECEIPT SLIP
              </Text>

              {labelUrl ? (
                <XStack
                  padding={10}
                  borderRadius={tokens.radius.md}
                  borderWidth={1}
                  borderColor={tokens.border}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <XStack alignItems="center" gap={10} flex={1}>
                    <Image
                      source={{ uri: labelUrl }}
                      style={{ width: 48, height: 48, borderRadius: 6 }}
                      resizeMode="cover"
                    />
                    <YStack flex={1}>
                      <Text fontSize={12} fontWeight="700" color={tokens.text}>
                        Label Attached
                      </Text>
                      <Text fontSize={10} color={tokens.textMuted} numberOfLines={1}>
                        {labelUrl}
                      </Text>
                    </YStack>
                  </XStack>

                  <Pressable
                    onPress={() => setLabelUrl(null)}
                    style={{ cursor: 'pointer', padding: 8 } as any}
                  >
                    <LuX size={18} color={tokens.error} />
                  </Pressable>
                </XStack>
              ) : (
                <Pressable
                  onPress={handlePickAndUploadLabel}
                  disabled={uploadingImage}
                  style={{ cursor: 'pointer' } as any}
                >
                  <XStack
                    paddingVertical={14}
                    paddingHorizontal={16}
                    borderRadius={tokens.radius.md}
                    borderWidth={1.5}
                    borderColor={tokens.accent}
                    borderStyle="dashed"
                    backgroundColor={`${tokens.accent}08`}
                    alignItems="center"
                    justifyContent="center"
                    gap={8}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={tokens.accent} />
                    ) : (
                      <>
                        <LuImage size={18} color={tokens.accent} />
                        <Text fontSize={13} fontWeight="700" color={tokens.accent}>
                          Attach Photo / PDF of Label
                        </Text>
                      </>
                    )}
                  </XStack>
                </Pressable>
              )}
            </YStack>

            {/* Notes */}
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted} letterSpacing={0.4}>
                INTERNAL NOTES (OPTIONAL)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Verified with vendor Ramesh over phone"
                placeholderTextColor={tokens.textMuted}
                multiline
                numberOfLines={2}
                style={[
                  styles.textInput,
                  {
                    height: 64,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surfaceRaised,
                    color: tokens.text,
                    textAlignVertical: 'top',
                  },
                ]}
              />
            </YStack>
          </ScrollView>

          {/* Footer Actions */}
          <XStack
            paddingHorizontal={18}
            paddingVertical={14}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            gap={12}
            justifyContent="flex-end"
          >
            <Pressable
              onPress={onDismiss}
              disabled={submitting}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                paddingVertical={10}
                paddingHorizontal={18}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={13} fontWeight="700" color={tokens.text}>
                  Cancel
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={submitting}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                paddingVertical={10}
                paddingHorizontal={20}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
                gap={6}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <LuCheck size={16} color="#FFFFFF" />
                    <Text fontSize={13} fontWeight="800" color="#FFFFFF">
                      Confirm & Mark In Transit
                    </Text>
                  </>
                )}
              </XStack>
            </Pressable>
          </XStack>
        </YStack>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  scrollContent: {
    padding: 18,
    gap: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
});

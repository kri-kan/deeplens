import React from 'react';
import {
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuX,
  LuStore,
  LuTruck,
  LuCopy,
  LuExternalLink,
} from '../../icons/lu';
import { useTheme } from '@/theme';
import { VendorListingItemData } from '../AdminVendorListingCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AdminVendorListingSheetProps {
  visible: boolean;
  listing: VendorListingItemData | null;
  mediaList?: { id: string; url: string }[];
  onClose: () => void;
  onOpenWhatsApp?: () => void;
  onCopyDescription?: () => void;
}

export function AdminVendorListingSheet({
  visible,
  listing,
  mediaList = [],
  onClose,
  onOpenWhatsApp,
  onCopyDescription,
}: AdminVendorListingSheetProps) {
  const { tokens } = useTheme();

  if (!visible || !listing) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <XStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
        {/* Dismissable Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <XStack flex={1} />
        </TouchableWithoutFeedback>

        {/* Slide-Up Bottom Sheet Surface */}
        <YStack
          width="100%"
          maxHeight="85%"
          backgroundColor={tokens.surface}
          borderTopLeftRadius={tokens.radius.xl}
          borderTopRightRadius={tokens.radius.xl}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: -4 }}
          shadowOpacity={0.2}
          shadowRadius={16}
          elevation={16}
        >
          {/* Grab Handle */}
          <XStack justifyContent="center" paddingTop={10} paddingBottom={4}>
            <YStack
              width={36}
              height={4}
              borderRadius={2}
              backgroundColor={tokens.border}
            />
          </XStack>

          {/* Header */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={16}
            paddingVertical={10}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
            <XStack alignItems="center" gap={8} flex={1}>
              <LuStore size={18} color={tokens.accent} />
              <Text fontSize={15} fontWeight="800" color={tokens.text} numberOfLines={1}>
                {listing.vendorName || 'Vendor Listing'}
              </Text>
            </XStack>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close vendor sheet"
              activeOpacity={0.7}
              onPress={onClose}
            >
              <XStack
                width={30}
                height={30}
                borderRadius={15}
                backgroundColor={tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuX size={16} color={tokens.text} />
              </XStack>
            </TouchableOpacity>
          </XStack>

          {/* Sheet Body Scroll View */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Listing Specific Media Strip */}
            {mediaList.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {mediaList.map((m, idx) => (
                  <YStack
                    key={m.id || idx}
                    width={180}
                    height={220}
                    borderRadius={tokens.radius.md}
                    overflow="hidden"
                    backgroundColor={tokens.surfaceRaised}
                  >
                    <Image
                      source={{ uri: m.url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                    />
                  </YStack>
                ))}
              </ScrollView>
            )}

            {/* Price & Shipping Details */}
            <XStack
              alignItems="center"
              justifyContent="space-between"
              padding={12}
              borderRadius={tokens.radius.md}
              backgroundColor={tokens.surfaceRaised}
            >
              <YStack gap={2}>
                <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                  VENDOR PRICE
                </Text>
                <Text fontSize={22} fontWeight="900" color={tokens.accent}>
                  ₹{listing.price !== undefined && listing.price !== null ? listing.price.toLocaleString('en-IN') : '---'}
                </Text>
              </YStack>

              {listing.isPlusShipping !== undefined && (
                <XStack
                  alignItems="center"
                  gap={6}
                  backgroundColor={!listing.isPlusShipping ? '#f0fdf4' : '#f8fafc'}
                  borderWidth={1}
                  borderColor={!listing.isPlusShipping ? '#bbf7d0' : tokens.border}
                  borderRadius={tokens.radius.sm}
                  paddingHorizontal={10}
                  paddingVertical={6}
                >
                  <LuTruck size={14} color={!listing.isPlusShipping ? '#16a34a' : tokens.textMuted} />
                  <Text
                    fontSize={12}
                    fontWeight="700"
                    color={!listing.isPlusShipping ? '#16a34a' : tokens.textMuted}
                  >
                    {!listing.isPlusShipping ? 'Free Shipping Included' : '+ Shipping Separate'}
                  </Text>
                </XStack>
              )}
            </XStack>

            {/* Listing Description Text */}
            <YStack gap={6}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={12} fontWeight="800" color={tokens.textMuted} letterSpacing={0.5}>
                  RAW VENDOR DESCRIPTION
                </Text>
                {onCopyDescription && listing.description && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Copy listing description"
                    activeOpacity={0.7}
                    onPress={onCopyDescription}
                  >
                    <XStack alignItems="center" gap={4}>
                      <LuCopy size={12} color={tokens.accent} />
                      <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                        Copy
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                )}
              </XStack>

              <YStack
                padding={12}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.surfaceRaised}
                borderWidth={1}
                borderColor={tokens.border}
              >
                <Text fontSize={13} lineHeight={19} color={tokens.text}>
                  {listing.description || 'No raw text attached to this listing.'}
                </Text>
              </YStack>
            </YStack>

            {/* WhatsApp Source Chat Action */}
            {onOpenWhatsApp && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open WhatsApp source chat"
                activeOpacity={0.85}
                onPress={onOpenWhatsApp}
                style={{ marginTop: 4 }}
              >
                <XStack
                  height={44}
                  borderRadius={tokens.radius.md}
                  backgroundColor="#25D366"
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                >
                  <LuExternalLink size={16} color="#ffffff" />
                  <Text fontSize={14} fontWeight="800" color="#ffffff">
                    View Source WhatsApp Chat
                  </Text>
                </XStack>
              </TouchableOpacity>
            )}
          </ScrollView>
        </YStack>
      </XStack>
    </Modal>
  );
}

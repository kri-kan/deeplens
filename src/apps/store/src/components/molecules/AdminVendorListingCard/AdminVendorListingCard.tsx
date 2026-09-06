import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuStore,
  LuTruck,
  LuCopy,
  LuMaximize2,
  LuExternalLink,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface VendorListingItemData {
  id: string;
  vendorName?: string;
  price?: number;
  currency?: string;
  isActive?: boolean;
  isPlusShipping?: boolean;
  updatedAt?: string;
  description?: string;
  sourceGroupId?: string;
  sourceJid?: string;
}

export interface AdminVendorListingCardProps {
  listing: VendorListingItemData;
  onExpand?: () => void;
  onOpenWhatsApp?: () => void;
  onCopyDescription?: () => void;
}

export function AdminVendorListingCard({
  listing,
  onExpand,
  onOpenWhatsApp,
  onCopyDescription,
}: AdminVendorListingCardProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.md}
      borderWidth={1}
      borderColor={tokens.border}
      padding={14}
      gap={10}
      opacity={listing.isActive ? 1 : 0.65}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={0.04}
      shadowRadius={4}
      elevation={1}
    >
      {/* Top Header: Vendor name + Action Buttons + Active Chip */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={6} flex={1}>
          <LuStore size={15} color={tokens.accent} />
          <Text
            fontSize={13}
            fontWeight="800"
            color={tokens.accent}
            numberOfLines={1}
            flex={1}
          >
            {listing.vendorName || 'Unknown Vendor'}
          </Text>
        </XStack>

        <XStack alignItems="center" gap={6}>
          {/* Expand Sheet Button */}
          {onExpand && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Expand vendor listing details"
              onPress={onExpand}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                width={26}
                height={26}
                borderRadius={13}
                backgroundColor={tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuMaximize2 size={12} color={tokens.text} />
              </XStack>
            </Pressable>
          )}

          {/* WhatsApp Chat Button */}
          {onOpenWhatsApp && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open WhatsApp source chat"
              onPress={onOpenWhatsApp}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                width={26}
                height={26}
                borderRadius={13}
                backgroundColor="#25D36620"
                alignItems="center"
                justifyContent="center"
              >
                <LuExternalLink size={12} color="#25D366" />
              </XStack>
            </Pressable>
          )}

          {/* Active Status Badge */}
          <XStack
            paddingHorizontal={7}
            paddingVertical={2}
            borderRadius={tokens.radius.full}
            backgroundColor={listing.isActive ? '#16a34a18' : tokens.surfaceRaised}
            borderWidth={1}
            borderColor={listing.isActive ? '#16a34a40' : tokens.border}
          >
            <Text
              fontSize={10}
              fontWeight="800"
              color={listing.isActive ? '#16a34a' : tokens.textMuted}
            >
              {listing.isActive ? 'Active' : 'Inactive'}
            </Text>
          </XStack>
        </XStack>
      </XStack>

      {/* Price & Shipping Info Row */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={8}>
          <Text fontSize={18} fontWeight="900" color={tokens.text}>
            ₹{listing.price !== undefined && listing.price !== null ? listing.price.toLocaleString('en-IN') : '---'}
          </Text>

          {listing.isPlusShipping !== undefined && (
            <XStack
              alignItems="center"
              gap={4}
              backgroundColor={!listing.isPlusShipping ? '#f0fdf4' : '#f8fafc'}
              borderWidth={1}
              borderColor={!listing.isPlusShipping ? '#bbf7d0' : tokens.border}
              borderRadius={tokens.radius.xs}
              paddingHorizontal={6}
              paddingVertical={2}
            >
              <LuTruck size={11} color={!listing.isPlusShipping ? '#16a34a' : tokens.textMuted} />
              <Text
                fontSize={10}
                fontWeight="700"
                color={!listing.isPlusShipping ? '#16a34a' : tokens.textMuted}
              >
                {!listing.isPlusShipping ? 'Free Shipping' : '+ Shipping'}
              </Text>
            </XStack>
          )}
        </XStack>

        <XStack alignItems="center" gap={6}>
          {listing.updatedAt && (
            <Text fontSize={11} color={tokens.textMuted} fontWeight="500">
              {listing.updatedAt}
            </Text>
          )}

          {onCopyDescription && listing.description && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copy vendor description"
              onPress={onCopyDescription}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                padding={4}
                borderRadius={tokens.radius.xs}
                backgroundColor={tokens.surfaceRaised}
              >
                <LuCopy size={12} color={tokens.textMuted} />
              </XStack>
            </Pressable>
          )}
        </XStack>
      </XStack>

      {/* Description Preview */}
      {listing.description && (
        <Text
          fontSize={12}
          lineHeight={17}
          color={tokens.textMuted}
          numberOfLines={3}
        >
          {listing.description.replace(/\s+/g, ' ').trim()}
        </Text>
      )}
    </YStack>
  );
}

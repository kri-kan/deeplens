import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Input, Spinner } from 'tamagui';
import { MapPin, Navigation, AlertCircle, Check, Sparkles } from 'lucide-react-native';
import { BottomSheet } from '../atoms/BottomSheet';
import { useTheme } from '../../theme';

export interface LocationPermissionSheetProps {
  visible: boolean;
  onClose: () => void;
  permissionStatus?: 'prompt' | 'denied' | 'granted';
  currentPincode?: string;
  onGrantPermission?: () => void;
  onUseCurrentLocation?: () => void;
  onPincodeSubmit?: (pincode: string) => void;
}

export function LocationPermissionSheet({
  visible,
  onClose,
  permissionStatus = 'prompt',
  currentPincode = '',
  onGrantPermission,
  onUseCurrentLocation,
  onPincodeSubmit,
}: LocationPermissionSheetProps) {
  const { tokens } = useTheme();
  const [pincode, setPincode] = useState(currentPincode);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [hasGrantedLocally, setHasGrantedLocally] = useState(false);
  const [submittedPincode, setSubmittedPincode] = useState(currentPincode);

  useEffect(() => {
    if (currentPincode) {
      setPincode(currentPincode);
      setSubmittedPincode(currentPincode);
    }
  }, [currentPincode]);

  const handleApplyPincode = () => {
    const trimmed = pincode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit Indian PIN code');
      return;
    }
    setError('');
    setSubmittedPincode(trimmed);
    onPincodeSubmit?.(trimmed);
  };

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setHasGrantedLocally(true);
    setError('');
    onUseCurrentLocation?.();
    setTimeout(() => {
      setIsLocating(false);
      const detected = currentPincode || '560001';
      setSubmittedPincode(detected);
      setPincode(detected);
    }, 500);
  };

  const handleGrant = () => {
    setIsLocating(true);
    setHasGrantedLocally(true);
    setError('');
    onGrantPermission?.();
    setTimeout(() => {
      setIsLocating(false);
      const detected = currentPincode || '560001';
      setSubmittedPincode(detected);
      setPincode(detected);
    }, 500);
  };

  const isPermissionGranted = permissionStatus === 'granted' || hasGrantedLocally;
  const showCoralWarning = !isPermissionGranted && !isLocating;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Choose Delivery Location"
      maxHeight="85%"
    >
      <YStack gap={14} paddingVertical={4}>
        {/* Coral Warning Banner for Permission Off (Myntra Inspiration) */}
        {showCoralWarning && (
          <XStack
            backgroundColor="#FFF0F3"
            borderColor="#FFD0D8"
            borderWidth={1}
            borderRadius={10}
            padding={12}
            justifyContent="space-between"
            alignItems="center"
            gap={10}
          >
            <XStack alignItems="center" gap={10} flex={1}>
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="#FFE2E6"
                alignItems="center"
                justifyContent="center"
              >
                <AlertCircle size={18} color="#E53935" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={13} fontWeight="800" color="#B71C1C">
                  Location permission is off
                </Text>
                <Text fontSize={11} color="#555555" lineHeight={15}>
                  Granting location permission helps us provide accurate delivery estimates & services.
                </Text>
              </YStack>
            </XStack>

            <XStack
              cursor="pointer"
              backgroundColor="#E53935"
              paddingHorizontal={14}
              paddingVertical={7}
              borderRadius={6}
              hoverStyle={{ opacity: 0.9 }}
              pressStyle={{ scale: 0.96 }}
              onPress={handleGrant}
            >
              <Text fontSize={11} fontWeight="800" color="#FFFFFF" letterSpacing={0.5}>
                GRANT
              </Text>
            </XStack>
          </XStack>
        )}

        {/* GPS Location Button */}
        <XStack
          cursor="pointer"
          borderWidth={1.5}
          borderColor={tokens.accent}
          borderRadius={10}
          paddingVertical={12}
          paddingHorizontal={16}
          alignItems="center"
          justifyContent="center"
          gap={10}
          backgroundColor={tokens.accentSubtle}
          hoverStyle={{ opacity: 0.92 }}
          pressStyle={{ scale: 0.98 }}
          onPress={handleUseCurrentLocation}
        >
          {isLocating ? (
            <Spinner size="small" color={tokens.accent} />
          ) : (
            <Navigation size={18} color={tokens.accent} />
          )}
          <Text fontSize={14} fontWeight="700" color={tokens.accent}>
            {isLocating ? 'Detecting Location via GPS...' : 'Use Current Location'}
          </Text>
        </XStack>

        {/* Divider */}
        <XStack alignItems="center" gap={12} marginVertical={4}>
          <YStack flex={1} height={1} backgroundColor={tokens.border} />
          <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
            OR
          </Text>
          <YStack flex={1} height={1} backgroundColor={tokens.border} />
        </XStack>

        {/* Manual Pincode Input */}
        <YStack gap={8}>
          <Text fontSize={12} fontWeight="700" color={tokens.text}>
            Enter an Indian Pincode
          </Text>
          <XStack gap={10} alignItems="center">
            <XStack
              flex={1}
              borderWidth={1}
              borderColor={error ? '#E53935' : tokens.border}
              borderRadius={8}
              backgroundColor={tokens.surface}
              paddingHorizontal={12}
              alignItems="center"
              height={44}
            >
              <MapPin size={16} color={tokens.textMuted} />
              <Input
                value={pincode}
                onChangeText={(text) => {
                  setPincode(text);
                  setError('');
                }}
                placeholder="Enter 6-digit PIN code"
                keyboardType="numeric"
                maxLength={6}
                borderWidth={0}
                backgroundColor="transparent"
                color={tokens.text}
                fontSize={13}
                flex={1}
              />
            </XStack>

            <XStack
              cursor="pointer"
              backgroundColor="#E53935"
              height={44}
              paddingHorizontal={18}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
              hoverStyle={{ opacity: 0.9 }}
              pressStyle={{ scale: 0.97 }}
              onPress={handleApplyPincode}
            >
              <Text fontSize={12} fontWeight="800" color="#FFFFFF" letterSpacing={0.5}>
                APPLY
              </Text>
            </XStack>
          </XStack>

          {error ? (
            <Text fontSize={11} color="#E53935" fontWeight="600">
              {error}
            </Text>
          ) : null}
        </YStack>

        {/* Active Pincode Confirmation & Delivery Perks */}
        {Boolean(submittedPincode && !error) ? (
          <YStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={10}
            padding={12}
            borderWidth={1}
            borderColor={tokens.border}
            gap={6}
          >
            <XStack alignItems="center" gap={8}>
              <Check size={16} color="#2E7D32" />
              <Text fontSize={12} fontWeight="700" color="#2E7D32">
                Delivering to Pincode: {submittedPincode}
              </Text>
            </XStack>
            <XStack alignItems="center" gap={6}>
              <Sparkles size={13} color={tokens.accent} />
              <Text fontSize={11} color={tokens.textSecondary}>
                Express Delivery & Cash on Delivery available for this area.
              </Text>
            </XStack>
          </YStack>
        ) : null}
      </YStack>
    </BottomSheet>
  );
}

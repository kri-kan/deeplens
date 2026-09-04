import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { LuMapPin, LuCheck, LuTruck } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type DeliveryPincodeCheckerProps = {
  initialPincode?: string;
  onPincodeChange?: (pincode: string) => void;
};

export function DeliveryPincodeChecker({
  initialPincode = '',
  onPincodeChange,
}: DeliveryPincodeCheckerProps) {
  const { tokens } = useTheme();
  const [pincode, setPincode] = useState(initialPincode);
  const [inputVal, setInputVal] = useState(initialPincode);
  const [isEditing, setIsEditing] = useState(!initialPincode);
  const [error, setError] = useState('');

  const handleApply = () => {
    if (!/^\d{6}$/.test(inputVal.trim())) {
      setError('Please enter a valid 6-digit PIN code');
      return;
    }
    setError('');
    setPincode(inputVal.trim());
    setIsEditing(false);
    onPincodeChange?.(inputVal.trim());
  };

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={12}
      padding={14}
      gap={10}
    >
      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={10}>
        <XStack alignItems="center" gap={8}>
          <LuMapPin size={16} color={tokens.accent} />
          <Text fontSize={13} fontWeight="700" color={tokens.text}>
            {pincode ? `Deliver to: ` : 'Check delivery time & services'}
          </Text>
          {pincode && (
            <Text fontSize={13} fontWeight="800" color={tokens.text}>
              {pincode}
            </Text>
          )}
        </XStack>

        {!isEditing && pincode ? (
          <XStack
            cursor="pointer"
            paddingHorizontal={12}
            paddingVertical={4}
            borderRadius={6}
            borderWidth={1}
            borderColor={tokens.accent}
            onPress={() => setIsEditing(true)}
            hoverStyle={{ backgroundColor: tokens.accentSubtle }}
          >
            <Text fontSize={11} fontWeight="800" color={tokens.accent} textTransform="uppercase">
              Change
            </Text>
          </XStack>
        ) : (
          !isEditing && (
            <XStack
              cursor="pointer"
              paddingHorizontal={12}
              paddingVertical={5}
              borderRadius={6}
              borderWidth={1}
              borderColor="#e53935"
              onPress={() => setIsEditing(true)}
              hoverStyle={{ backgroundColor: 'rgba(229, 57, 53, 0.08)' }}
            >
              <Text fontSize={11} fontWeight="800" color="#e53935" textTransform="uppercase">
                Enter Pin Code
              </Text>
            </XStack>
          )
        )}
      </XStack>

      {/* Input Row when Editing */}
      {isEditing && (
        <YStack gap={6}>
          <XStack gap={8} alignItems="center">
            <XStack flex={1} maxWidth={260}>
              <Input
                value={inputVal}
                onChangeText={(t) => {
                  setInputVal(t);
                  setError('');
                }}
                placeholder="Enter 6-digit pincode"
                keyboardType="numeric"
                maxLength={6}
                size="$3"
                borderWidth={1}
                borderColor={error ? tokens.error : tokens.border}
                backgroundColor={tokens.background}
                color={tokens.text}
                fontSize={13}
              />
            </XStack>
            <XStack
              cursor="pointer"
              backgroundColor="#e53935"
              paddingHorizontal={16}
              paddingVertical={8}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
              onPress={handleApply}
              hoverStyle={{ scale: 1.03 }}
              pressStyle={{ scale: 0.96 }}
            >
              <Text fontSize={12} fontWeight="800" color="#ffffff">
                CHECK
              </Text>
            </XStack>
          </XStack>
          {error ? (
            <Text fontSize={11} color={tokens.error} fontWeight="600">
              {error}
            </Text>
          ) : null}
        </YStack>
      )}

      {/* Delivery Estimate Status when Pincode is set */}
      {pincode && !isEditing && (
        <XStack alignItems="center" gap={6} paddingTop={4}>
          <LuTruck size={14} color="#2e7d32" />
          <Text fontSize={12} color="#2e7d32" fontWeight="700">
            Delivery by Friday, 5 Sep · <Text color="#2e7d32" fontWeight="800">FREE Dispatch</Text>
          </Text>
        </XStack>
      )}
    </YStack>
  );
}

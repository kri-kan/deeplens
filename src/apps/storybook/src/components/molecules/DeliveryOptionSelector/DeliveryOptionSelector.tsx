import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuTruck, LuZap } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type DeliverySpeed = 'standard' | 'express';

export type DeliveryOptionSelectorProps = {
  selectedSpeed?: DeliverySpeed;
  onSpeedChange?: (speed: DeliverySpeed) => void;
};

export function DeliveryOptionSelector({
  selectedSpeed = 'standard',
  onSpeedChange,
}: DeliveryOptionSelectorProps) {
  const { tokens } = useTheme();
  const [speed, setSpeed] = useState<DeliverySpeed>(selectedSpeed);

  const handleSelect = (s: DeliverySpeed) => {
    setSpeed(s);
    onSpeedChange?.(s);
  };

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      padding={16}
      gap={14}
    >
      <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.8}>
        Choose Delivery Speed
      </Text>

      <YStack gap={10}>
        {/* Standard Delivery */}
        <XStack
          padding={14}
          borderRadius={12}
          borderWidth={1.5}
          borderColor={speed === 'standard' ? '#e53935' : tokens.border}
          backgroundColor={speed === 'standard' ? tokens.surfaceRaised : tokens.background}
          cursor="pointer"
          onPress={() => handleSelect('standard')}
          alignItems="center"
          justifyContent="space-between"
        >
          <XStack alignItems="center" gap={10}>
            <XStack
              width={20}
              height={20}
              borderRadius={10}
              borderWidth={2}
              borderColor={speed === 'standard' ? '#e53935' : tokens.borderStrong}
              alignItems="center"
              justifyContent="center"
            >
              {speed === 'standard' && (
                <XStack width={10} height={10} borderRadius={5} backgroundColor="#e53935" />
              )}
            </XStack>
            <LuTruck size={18} color={tokens.text} />
            <YStack>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>
                Standard Artisan Delivery (4–6 Days)
              </Text>
              <Text fontSize={11} color={tokens.textSecondary}>
                Carefully packaged from master weavers
              </Text>
            </YStack>
          </XStack>
          <Text fontSize={13} fontWeight="800" color="#2e7d32">
            FREE
          </Text>
        </XStack>

        {/* Express Delivery */}
        <XStack
          padding={14}
          borderRadius={12}
          borderWidth={1.5}
          borderColor={speed === 'express' ? '#e53935' : tokens.border}
          backgroundColor={speed === 'express' ? tokens.surfaceRaised : tokens.background}
          cursor="pointer"
          onPress={() => handleSelect('express')}
          alignItems="center"
          justifyContent="space-between"
        >
          <XStack alignItems="center" gap={10}>
            <XStack
              width={20}
              height={20}
              borderRadius={10}
              borderWidth={2}
              borderColor={speed === 'express' ? '#e53935' : tokens.borderStrong}
              alignItems="center"
              justifyContent="center"
            >
              {speed === 'express' && (
                <XStack width={10} height={10} borderRadius={5} backgroundColor="#e53935" />
              )}
            </XStack>
            <LuZap size={18} color="#e53935" />
            <YStack>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>
                Express Air Priority (2–3 Days)
              </Text>
              <Text fontSize={11} color={tokens.textSecondary}>
                Guaranteed expedited handloom dispatch
              </Text>
            </YStack>
          </XStack>
          <Text fontSize={13} fontWeight="800" color={tokens.text}>
            ₹149
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}

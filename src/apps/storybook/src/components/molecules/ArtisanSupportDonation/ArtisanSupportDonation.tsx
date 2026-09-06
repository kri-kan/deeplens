import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuHeart } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type ArtisanSupportDonationProps = {
  selectedAmount?: number;
  onDonationChange?: (amount: number) => void;
};

export function ArtisanSupportDonation({
  selectedAmount = 20,
  onDonationChange,
}: ArtisanSupportDonationProps) {
  const { tokens } = useTheme();
  const [isChecked, setIsChecked] = useState(true);
  const [amount, setAmount] = useState<number>(selectedAmount);

  const amounts = [10, 20, 50, 100];

  const handleToggle = () => {
    const nextChecked = !isChecked;
    setIsChecked(nextChecked);
    onDonationChange?.(nextChecked ? amount : 0);
  };

  const handleSelectAmount = (val: number) => {
    setIsChecked(true);
    setAmount(val);
    onDonationChange?.(val);
  };

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      padding={16}
      gap={12}
    >
      <XStack alignItems="center" gap={6}>
        <LuHeart size={14} color="#e53935" fill="#e53935" />
        <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
          Support Traditional Handloom Weavers
        </Text>
      </XStack>

      <XStack alignItems="center" gap={10} cursor="pointer" onPress={handleToggle}>
        <XStack
          width={18}
          height={18}
          borderRadius={4}
          borderWidth={1.5}
          borderColor={isChecked ? '#e53935' : tokens.borderStrong}
          backgroundColor={isChecked ? '#e53935' : 'transparent'}
          alignItems="center"
          justifyContent="center"
        >
          {isChecked && <LuCheck size={12} color="#ffffff" strokeWidth={3} />}
        </XStack>
        <Text fontSize={12} fontWeight="600" color={tokens.text}>
          Donate to preserve heritage weaver clusters
        </Text>
      </XStack>

      {/* Donation Chips */}
      <XStack gap={8} alignItems="center">
        {amounts.map((val) => {
          const isSelected = isChecked && amount === val;
          return (
            <XStack
              key={val}
              paddingHorizontal={16}
              paddingVertical={6}
              borderRadius={20}
              cursor="pointer"
              backgroundColor={isSelected ? '#e53935' : tokens.surfaceRaised}
              borderWidth={1}
              borderColor={isSelected ? '#e53935' : tokens.border}
              alignItems="center"
              justifyContent="center"
              onPress={() => handleSelectAmount(val)}
              hoverStyle={{ scale: 1.05 }}
              pressStyle={{ scale: 0.95 }}
            >
              <Text
                fontSize={12}
                fontWeight="700"
                color={isSelected ? '#ffffff' : tokens.text}
              >
                ₹{val}
              </Text>
            </XStack>
          );
        })}

        <Text
          fontSize={11}
          fontWeight="700"
          color="#e53935"
          marginLeft={4}
          cursor="pointer"
          hoverStyle={{ textDecorationLine: 'underline' }}
        >
          Know More
        </Text>
      </XStack>
    </YStack>
  );
}

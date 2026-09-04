import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { LuCreditCard, LuQrCode, LuBuilding2, LuBanknote, LuShieldCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type PaymentMethodType = 'upi' | 'card' | 'netbanking' | 'cod';

export type PaymentMethodSelectorProps = {
  selectedMethod?: PaymentMethodType;
  onMethodChange?: (method: PaymentMethodType) => void;
};

export function PaymentMethodSelector({
  selectedMethod = 'upi',
  onMethodChange,
}: PaymentMethodSelectorProps) {
  const { tokens } = useTheme();
  const [method, setMethod] = useState<PaymentMethodType>(selectedMethod);
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC');

  const handleSelect = (m: PaymentMethodType) => {
    setMethod(m);
    onMethodChange?.(m);
  };

  const banks = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak'];

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
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.8}>
          Select Payment Method
        </Text>
        <XStack alignItems="center" gap={4}>
          <LuShieldCheck size={14} color="#2e7d32" />
          <Text fontSize={11} fontWeight="800" color="#2e7d32">
            100% Safe & Verified
          </Text>
        </XStack>
      </XStack>

      {/* Methods Tabs / Radios */}
      <YStack gap={10}>
        {/* 1. UPI Payment */}
        <YStack
          borderRadius={12}
          borderWidth={1.5}
          borderColor={method === 'upi' ? '#e53935' : tokens.border}
          backgroundColor={method === 'upi' ? tokens.surfaceRaised : tokens.background}
          overflow="hidden"
        >
          <XStack
            padding={14}
            cursor="pointer"
            alignItems="center"
            justifyContent="space-between"
            onPress={() => handleSelect('upi')}
          >
            <XStack alignItems="center" gap={10}>
              <XStack
                width={20}
                height={20}
                borderRadius={10}
                borderWidth={2}
                borderColor={method === 'upi' ? '#e53935' : tokens.borderStrong}
                alignItems="center"
                justifyContent="center"
              >
                {method === 'upi' && (
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#e53935" />
                )}
              </XStack>
              <LuQrCode size={18} color={tokens.text} />
              <YStack>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  UPI (GPay / PhonePe / Paytm / QR)
                </Text>
                <Text fontSize={11} color={tokens.textSecondary}>
                  Instant zero-convenience fee payment
                </Text>
              </YStack>
            </XStack>
            <Text fontSize={10} fontWeight="800" color="#2e7d32" backgroundColor="rgba(46,125,50,0.1)" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
              FASTEST
            </Text>
          </XStack>

          {method === 'upi' && (
            <YStack padding={14} paddingTop={0} gap={10}>
              <Text fontSize={11} color={tokens.textSecondary}>
                Enter your Virtual Payment Address (UPI ID):
              </Text>
              <XStack gap={8}>
                <XStack flex={1}>
                  <Input
                    placeholder="e.g. yourname@oksbi / 9876543210@paytm"
                    value={upiId}
                    onChangeText={setUpiId}
                    size="$3"
                    fontSize={12}
                    backgroundColor={tokens.background}
                    color={tokens.text}
                  />
                </XStack>
                <XStack
                  paddingHorizontal={12}
                  backgroundColor={tokens.accent}
                  borderRadius={6}
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                >
                  <Text fontSize={11} fontWeight="800" color={tokens.accentForeground}>
                    VERIFY
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          )}
        </YStack>

        {/* 2. Credit / Debit Card */}
        <YStack
          borderRadius={12}
          borderWidth={1.5}
          borderColor={method === 'card' ? '#e53935' : tokens.border}
          backgroundColor={method === 'card' ? tokens.surfaceRaised : tokens.background}
          overflow="hidden"
        >
          <XStack
            padding={14}
            cursor="pointer"
            alignItems="center"
            justifyContent="space-between"
            onPress={() => handleSelect('card')}
          >
            <XStack alignItems="center" gap={10}>
              <XStack
                width={20}
                height={20}
                borderRadius={10}
                borderWidth={2}
                borderColor={method === 'card' ? '#e53935' : tokens.borderStrong}
                alignItems="center"
                justifyContent="center"
              >
                {method === 'card' && (
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#e53935" />
                )}
              </XStack>
              <LuCreditCard size={18} color={tokens.text} />
              <YStack>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Credit / Debit Card
                </Text>
                <Text fontSize={11} color={tokens.textSecondary}>
                  Visa, MasterCard, RuPay, Maestro
                </Text>
              </YStack>
            </XStack>
          </XStack>

          {method === 'card' && (
            <YStack padding={14} paddingTop={0} gap={10}>
              <Input
                placeholder="Card Number (16 digits)"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
                maxLength={19}
                size="$3"
                fontSize={12}
                backgroundColor={tokens.background}
                color={tokens.text}
              />
              <XStack gap={10}>
                <XStack flex={1}>
                  <Input
                    placeholder="MM / YY"
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    maxLength={5}
                    size="$3"
                    fontSize={12}
                    backgroundColor={tokens.background}
                    color={tokens.text}
                  />
                </XStack>
                <XStack flex={1}>
                  <Input
                    placeholder="CVV"
                    value={cardCvv}
                    onChangeText={setCardCvv}
                    secureTextEntry
                    maxLength={4}
                    size="$3"
                    fontSize={12}
                    backgroundColor={tokens.background}
                    color={tokens.text}
                  />
                </XStack>
              </XStack>
            </YStack>
          )}
        </YStack>

        {/* 3. Net Banking */}
        <YStack
          borderRadius={12}
          borderWidth={1.5}
          borderColor={method === 'netbanking' ? '#e53935' : tokens.border}
          backgroundColor={method === 'netbanking' ? tokens.surfaceRaised : tokens.background}
          overflow="hidden"
        >
          <XStack
            padding={14}
            cursor="pointer"
            alignItems="center"
            justifyContent="space-between"
            onPress={() => handleSelect('netbanking')}
          >
            <XStack alignItems="center" gap={10}>
              <XStack
                width={20}
                height={20}
                borderRadius={10}
                borderWidth={2}
                borderColor={method === 'netbanking' ? '#e53935' : tokens.borderStrong}
                alignItems="center"
                justifyContent="center"
              >
                {method === 'netbanking' && (
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#e53935" />
                )}
              </XStack>
              <LuBuilding2 size={18} color={tokens.text} />
              <YStack>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Net Banking
                </Text>
                <Text fontSize={11} color={tokens.textSecondary}>
                  All Indian major banks supported
                </Text>
              </YStack>
            </XStack>
          </XStack>

          {method === 'netbanking' && (
            <XStack padding={14} paddingTop={0} gap={8} flexWrap="wrap">
              {banks.map((b) => (
                <XStack
                  key={b}
                  paddingHorizontal={12}
                  paddingVertical={6}
                  borderRadius={6}
                  cursor="pointer"
                  backgroundColor={selectedBank === b ? tokens.accent : tokens.background}
                  borderWidth={1}
                  borderColor={selectedBank === b ? tokens.accent : tokens.border}
                  onPress={() => setSelectedBank(b)}
                >
                  <Text
                    fontSize={11}
                    fontWeight="800"
                    color={selectedBank === b ? tokens.accentForeground : tokens.text}
                  >
                    {b} Bank
                  </Text>
                </XStack>
              ))}
            </XStack>
          )}
        </YStack>

        {/* 4. Cash on Delivery */}
        <YStack
          borderRadius={12}
          borderWidth={1.5}
          borderColor={method === 'cod' ? '#e53935' : tokens.border}
          backgroundColor={method === 'cod' ? tokens.surfaceRaised : tokens.background}
          overflow="hidden"
        >
          <XStack
            padding={14}
            cursor="pointer"
            alignItems="center"
            justifyContent="space-between"
            onPress={() => handleSelect('cod')}
          >
            <XStack alignItems="center" gap={10}>
              <XStack
                width={20}
                height={20}
                borderRadius={10}
                borderWidth={2}
                borderColor={method === 'cod' ? '#e53935' : tokens.borderStrong}
                alignItems="center"
                justifyContent="center"
              >
                {method === 'cod' && (
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#e53935" />
                )}
              </XStack>
              <LuBanknote size={18} color={tokens.text} />
              <YStack>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Cash on Delivery (Cash / UPI at Doorstep)
                </Text>
                <Text fontSize={11} color={tokens.textSecondary}>
                  Pay in cash or scan delivery agent UPI QR
                </Text>
              </YStack>
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}

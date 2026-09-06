import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { LuPhone, LuShieldCheck, LuArrowLeft, LuCheck } from 'react-icons/lu';
import { FcGoogle } from 'react-icons/fc';
import { BottomSheet } from '../../atoms/BottomSheet';
import { useTheme } from '../../../theme';

export interface AuthSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (userData: { phone: string; method: 'phone' | 'google' }) => void;
}

export function AuthSheet({ visible, onClose, onSuccess }: AuthSheetProps) {
  const { tokens } = useTheme();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const handleSendOtp = () => {
    const trimmed = phone.trim();
    if (!/^[6-9]\d{9}$/.test(trimmed)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setError('');
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('otp');
    }, 400);
  };

  const handleVerifyOtp = () => {
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setError('');
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess?.({ phone: `+91 ${phone}`, method: 'phone' });
      onClose();
      // Reset
      setStep('phone');
      setPhone('');
      setOtp('');
    }, 500);
  };

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess?.({ phone: 'google-authenticated', method: 'google' });
      onClose();
    }, 500);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setStep('phone');
        setError('');
        onClose();
      }}
      title={step === 'phone' ? 'Login or Signup' : 'Verify Mobile'}
      headerRight={
        step === 'otp' ? (
          <XStack
            cursor="pointer"
            alignItems="center"
            gap={4}
            onPress={() => {
              setStep('phone');
              setError('');
            }}
          >
            <LuArrowLeft size={14} color={tokens.textSecondary} />
            <Text fontSize={12} color={tokens.textSecondary}>
              Back
            </Text>
          </XStack>
        ) : undefined
      }
      maxHeight="85%"
    >
      <YStack gap={14} paddingVertical={6}>
        {step === 'phone' ? (
          <>
            {/* Value Proposition Header */}
            <YStack
              backgroundColor={tokens.surfaceRaised}
              padding={12}
              borderRadius={10}
              gap={4}
              borderWidth={1}
              borderColor={tokens.border}
            >
              <Text fontSize={14} fontWeight="800" color={tokens.text}>
                Welcome to Vayyari
              </Text>
              <Text fontSize={12} color={tokens.textSecondary} lineHeight={16}>
                Enter your mobile number to get access to orders, wishlist, and fast checkout.
              </Text>
            </YStack>

            {/* Mobile Number Input */}
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Mobile Number
              </Text>
              <XStack
                borderWidth={1}
                borderColor={error ? '#E53935' : tokens.border}
                borderRadius={8}
                backgroundColor={tokens.surface}
                alignItems="center"
                height={46}
                paddingHorizontal={12}
                gap={8}
              >
                <Text fontSize={14} fontWeight="700" color={tokens.textSecondary}>
                  +91
                </Text>
                <YStack width={1} height={20} backgroundColor={tokens.border} />
                <Input
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setError('');
                  }}
                  placeholder="10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  borderWidth={0}
                  backgroundColor="transparent"
                  color={tokens.text}
                  fontSize={14}
                  flex={1}
                />
              </XStack>
              {error ? (
                <Text fontSize={11} color="#E53935" fontWeight="600">
                  {error}
                </Text>
              ) : null}
            </YStack>

            {/* Disclaimer */}
            <Text fontSize={11} color={tokens.textMuted} lineHeight={15}>
              By continuing, I agree to Vayyari's{' '}
              <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                Terms of Use
              </Text>{' '}
              &{' '}
              <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                Privacy Policy
              </Text>
              .
            </Text>

            {/* Primary Continue CTA */}
            <XStack
              cursor="pointer"
              backgroundColor="#E53935"
              height={46}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
              hoverStyle={{ opacity: 0.92 }}
              pressStyle={{ scale: 0.98 }}
              onPress={handleSendOtp}
            >
              <Text fontSize={13} fontWeight="800" color="#FFFFFF" letterSpacing={0.5}>
                {isSubmitting ? 'SENDING OTP...' : 'CONTINUE'}
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

            {/* Google Social Login */}
            <XStack
              cursor="pointer"
              borderWidth={1}
              borderColor={tokens.border}
              backgroundColor={tokens.background}
              height={46}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
              gap={10}
              hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
              pressStyle={{ scale: 0.98 }}
              onPress={handleGoogleLogin}
            >
              <FcGoogle size={20} />
              <Text fontSize={13} fontWeight="700" color={tokens.text}>
                Continue with Google
              </Text>
            </XStack>
          </>
        ) : (
          <>
            {/* OTP Verification Screen */}
            <YStack
              backgroundColor={tokens.surfaceRaised}
              padding={12}
              borderRadius={10}
              gap={4}
              borderWidth={1}
              borderColor={tokens.border}
            >
              <XStack alignItems="center" gap={8}>
                <LuShieldCheck size={18} color="#2E7D32" />
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Verification Code Sent
                </Text>
              </XStack>
              <Text fontSize={12} color={tokens.textSecondary}>
                Please enter the 6-digit OTP sent to{' '}
                <Text fontWeight="700" color={tokens.text}>
                  +91 {phone}
                </Text>
              </Text>
            </YStack>

            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                6-Digit OTP Code
              </Text>
              <Input
                value={otp}
                onChangeText={(t) => {
                  setOtp(t);
                  setError('');
                }}
                placeholder="• • • • • •"
                keyboardType="numeric"
                maxLength={6}
                height={46}
                borderWidth={1}
                borderColor={error ? '#E53935' : tokens.border}
                borderRadius={8}
                backgroundColor={tokens.surface}
                color={tokens.text}
                fontSize={18}
                letterSpacing={6}
                textAlign="center"
              />
              {error ? (
                <Text fontSize={11} color="#E53935" fontWeight="600">
                  {error}
                </Text>
              ) : null}
            </YStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} color={tokens.textSecondary}>
                Didn't receive OTP?
              </Text>
              <Text
                fontSize={12}
                fontWeight="700"
                color={tokens.accent}
                cursor="pointer"
                onPress={() => alert('OTP Resent to your mobile')}
              >
                Resend OTP
              </Text>
            </XStack>

            <XStack
              cursor="pointer"
              backgroundColor="#E53935"
              height={46}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
              hoverStyle={{ opacity: 0.92 }}
              pressStyle={{ scale: 0.98 }}
              onPress={handleVerifyOtp}
            >
              <Text fontSize={13} fontWeight="800" color="#FFFFFF" letterSpacing={0.5}>
                {isSubmitting ? 'VERIFYING...' : 'VERIFY & PROCEED'}
              </Text>
            </XStack>
          </>
        )}
      </YStack>
    </BottomSheet>
  );
}

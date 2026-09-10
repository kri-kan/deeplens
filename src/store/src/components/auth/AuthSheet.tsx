import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}
import { BottomSheet } from '../atoms/BottomSheet';
import { useTheme } from '../../theme';

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
      setStep('phone');
      setPhone('');
      setOtp('');
    }, 500);
  };

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess?.({ phone: '+91 98765 43210', method: 'google' });
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
            <ArrowLeft size={14} color={tokens.textSecondary} />
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
              <GoogleIcon size={20} />
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
                <ShieldCheck size={18} color="#2E7D32" />
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

import React from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuArrowRight, LuRefreshCw, LuLock } from '../../icons/lu';
import { OtpDigitInput } from '../../atoms/OtpDigitInput/OtpDigitInput';

export interface WhatsAppAuthCardProps {
  step: 'phone' | 'otp' | 'authenticated';
  phone: string;
  onPhoneChange: (val: string) => void;
  otp: string;
  onOtpChange: (val: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  mockOtpHint?: string | null;
  resendCountdown?: number;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onEditPhone?: () => void;
  onLogout?: () => void;
  customerProfile?: {
    userId: string;
    phone: string;
    fullName?: string | null;
  } | null;
}

export const WhatsAppAuthCard: React.FC<WhatsAppAuthCardProps> = ({
  step,
  phone,
  onPhoneChange,
  otp,
  onOtpChange,
  isLoading = false,
  errorMessage = null,
  mockOtpHint = null,
  resendCountdown = 0,
  onSendOtp,
  onVerifyOtp,
  onEditPhone,
  onLogout,
  customerProfile,
}) => {
  return (
    <View style={styles.card}>
      {/* Header with WhatsApp Brand Touchpoint */}
      <XStack alignItems="center" gap="$3" marginBottom="$3">
        <View style={styles.whatsappIconCircle}>
          <Text style={styles.whatsappIconText}>WA</Text>
        </View>
        <YStack flex={1}>
          <Text style={styles.cardTitle}>
            {step === 'authenticated'
              ? 'Vayyari Member Account'
              : step === 'otp'
              ? 'Enter Verification Code'
              : 'Sign in with WhatsApp'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {step === 'authenticated'
              ? '365-day persistent shopping identity active'
              : step === 'otp'
              ? `Sent 6-digit code to ${phone}`
              : 'Instant OTP. No passwords, valid for 1 year.'}
          </Text>
        </YStack>
      </XStack>

      {/* Error Banner */}
      {Boolean(errorMessage) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Mock Mode OTP Hint (when Meta live number is pending configuration) */}
      {step === 'otp' && Boolean(mockOtpHint) && (
        <View style={styles.mockHintBox}>
          <Text style={styles.mockHintLabel}>TEST MODE CODE:</Text>
          <Text style={styles.mockHintCode}>{mockOtpHint}</Text>
        </View>
      )}

      {/* Step 1: Phone Input */}
      {step === 'phone' && (
        <YStack gap="$3" marginTop="$2">
          <View style={styles.phoneInputRow}>
            <View style={styles.countryBadge}>
              <Text style={styles.countryText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={onPhoneChange}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isLoading}
              style={styles.phoneInput}
              autoFocus
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              phone.length < 10 && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
            disabled={phone.length < 10 || isLoading}
            onPress={onSendOtp}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <XStack alignItems="center" gap="$2">
                <Text style={styles.actionButtonText}>Send Code via WhatsApp</Text>
                <LuArrowRight size={18} color="#0F172A" />
              </XStack>
            )}
          </Pressable>

          <XStack alignItems="center" justifyContent="center" gap="$1" marginTop="$1">
            <LuLock size={12} color="#64748B" />
            <Text style={styles.guaranteeText}>We never spam or share your WhatsApp number.</Text>
          </XStack>
        </YStack>
      )}

      {/* Step 2: OTP Verification */}
      {step === 'otp' && (
        <YStack gap="$2" marginTop="$1">
          <OtpDigitInput
            value={otp}
            onChange={onOtpChange}
            disabled={isLoading}
            hasError={Boolean(errorMessage)}
          />

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              otp.length < 6 && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
            disabled={otp.length < 6 || isLoading}
            onPress={onVerifyOtp}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <XStack alignItems="center" gap="$2">
                <Text style={styles.actionButtonText}>Verify & Access Bag</Text>
                <LuCheck size={18} color="#0F172A" />
              </XStack>
            )}
          </Pressable>

          <XStack justifyContent="space-between" alignItems="center" marginTop="$2">
            <Pressable onPress={onEditPhone} disabled={isLoading}>
              <Text style={styles.linkText}>Edit Number</Text>
            </Pressable>

            {resendCountdown > 0 ? (
              <Text style={styles.countdownText}>Resend in {resendCountdown}s</Text>
            ) : (
              <Pressable onPress={onSendOtp} disabled={isLoading} style={styles.resendButton}>
                <XStack alignItems="center" gap="$1">
                  <LuRefreshCw size={12} color="#25D366" />
                  <Text style={styles.resendText}>Resend Code</Text>
                </XStack>
              </Pressable>
            )}
          </XStack>
        </YStack>
      )}

      {/* Step 3: Authenticated State */}
      {step === 'authenticated' && customerProfile && (
        <YStack gap="$3" marginTop="$2">
          <View style={styles.authenticatedProfileBox}>
            <XStack justifyContent="space-between" alignItems="center">
              <YStack>
                <Text style={styles.customerName}>
                  {customerProfile.fullName || 'Valued Customer'}
                </Text>
                <Text style={styles.customerPhone}>{customerProfile.phone}</Text>
                <Text style={styles.customerIdText}>{customerProfile.userId}</Text>
              </YStack>
              <View style={styles.sessionValidChip}>
                <Text style={styles.sessionValidText}>365-DAY ACTIVE</Text>
              </View>
            </XStack>
          </View>

          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
            onPress={onLogout}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </Pressable>
        </YStack>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: 420,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  whatsappIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '500',
  },
  mockHintBox: {
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderColor: 'rgba(37, 211, 102, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  mockHintLabel: {
    color: '#25D366',
    fontSize: 11,
    fontWeight: '700',
  },
  mockHintCode: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  countryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  countryText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
  },
  actionButton: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  guaranteeText: {
    color: '#64748B',
    fontSize: 11,
  },
  linkText: {
    color: '#94A3B8',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  countdownText: {
    color: '#64748B',
    fontSize: 13,
  },
  resendButton: {
    paddingVertical: 2,
  },
  resendText: {
    color: '#25D366',
    fontSize: 13,
    fontWeight: '600',
  },
  authenticatedProfileBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  customerPhone: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  customerIdText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  sessionValidChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sessionValidText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutButton: {
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoutButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});

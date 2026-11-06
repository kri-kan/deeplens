import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export interface DismissibleLoginModalProps {
  visible: boolean;
  onClose: () => void;
  returnUrl?: string;
  onSuccess?: (user?: any) => void;
  title?: string;
  subtitle?: string;
}

export const DismissibleLoginModal: React.FC<DismissibleLoginModalProps> = ({
  visible,
  onClose,
  returnUrl,
  onSuccess,
  title = 'Join Member Waitlist',
  subtitle = 'Sign in or create an account to get priority restock alerts the moment this exclusive weave becomes available.',
}) => {
  const { sendOtp, verifyOtp, loginWithGoogle } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setError('');
    setLoading(false);
    onClose();
  };

  const handleAuthSuccess = (userData?: any) => {
    handleClose();
    onSuccess?.(userData);

    const redirectPath =
      returnUrl || (typeof window !== 'undefined' ? window.location?.pathname : '');

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      redirectPath &&
      window.location?.pathname !== redirectPath
    ) {
      window.location.href = redirectPath;
    }
  };

  const handleSendOtp = async () => {
    const cleaned = phone.trim().replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await sendOtp(cleaned);
      if (res.success) {
        setStep('otp');
      } else {
        setError(res.message || 'Unable to send OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleaned = otp.trim();
    if (cleaned.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await verifyOtp(phone.trim(), cleaned);
      if (res.success) {
        let savedUser: any = null;
        let savedToken: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          savedToken = localStorage.getItem('vayyari_auth_token');
          try {
            savedUser = JSON.parse(localStorage.getItem('vayyari_auth_user') || 'null');
          } catch {}
        }
        handleAuthSuccess({
          user: savedUser || { id: `cust_${phone.trim()}`, phone: `+91 ${phone.trim()}` },
          token: savedToken || 'auth-token',
          phone: `+91 ${phone.trim()}`,
          method: 'phone',
        });
      } else {
        setError(res.message || 'Invalid OTP code. Please retry.');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        let savedUser: any = null;
        let savedToken: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          savedToken = localStorage.getItem('vayyari_auth_token');
          try {
            savedUser = JSON.parse(localStorage.getItem('vayyari_auth_user') || 'null');
          } catch {}
        }
        handleAuthSuccess({
          user: savedUser || { id: 'cust_google', name: 'Google User' },
          token: savedToken || 'auth-token',
          method: 'google',
        });
      } else {
        setError('Google sign-in could not be completed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in error');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const modalContent = (
    <View style={styles.backdrop}>
      <View style={styles.dialogContainer}>
        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          accessibilityLabel="Close modal"
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🔔</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {step === 'phone' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={[styles.inputRow, Boolean(error) && styles.inputRowError]}>
                  <Text style={styles.prefix}>+91</Text>
                  <View style={styles.inputDivider} />
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(t) => {
                      setPhone(t);
                      setError('');
                    }}
                  />
                </View>
                {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FAF7F2" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue with Mobile</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>6-Digit Verification Code</Text>
                <Text style={styles.helperText}>Sent to +91 {phone}</Text>
                <View style={[styles.inputRow, Boolean(error) && styles.inputRowError]}>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="• • • • • •"
                    placeholderTextColor="#CBD5E0"
                    keyboardType="numeric"
                    maxLength={6}
                    value={otp}
                    onChangeText={(t) => {
                      setOtp(t);
                      setError('');
                    }}
                  />
                </View>
                {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FAF7F2" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Join Waitlist</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setStep('phone');
                  setError('');
                }}
              >
                <Text style={styles.backButtonText}>← Change phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer disclaimer */}
        <Text style={styles.footerNote}>
          Vayyari respects your privacy. We will only contact you regarding restock notifications and order updates.
        </Text>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return modalContent;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {modalContent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }
      : {
          flex: 1,
        }),
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A365D',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  body: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    height: 46,
    paddingHorizontal: 12,
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  prefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  inputDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 4,
  },
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#1A365D',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#FAF7F2',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 16,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../app/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { useOnboarding } from '../../context/OnboardingContext';

export const OtpVerificationScreen: React.FC = () => {
  const { verifyOtp, sendOtp } = useAuth();
  const { params, navigate, goBack } = useNavigation();
  const { showToast } = useToast();
  const { completeOnboarding } = useOnboarding();

  const phone = params.phone || '9876543210';
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDigitChange = (text: string, index: number) => {
    const val = text.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    // Auto-advance
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits entered
    if (val && index === 5 && newDigits.every((d) => d !== '')) {
      submitOtp(newDigits.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitOtp = async (code: string) => {
    setLoading(true);
    const res = await verifyOtp(phone, code);
    setLoading(false);
    if (res.success) {
      completeOnboarding();
      showToast({ message: 'Patron Verified! Welcome to Vayyari', type: 'success' });
      navigate('home');
    } else {
      showToast({ message: res.message, type: 'error' });
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    const res = await sendOtp(phone);
    setLoading(false);
    if (res.success) {
      setTimer(30);
      showToast({ message: 'New OTP sent to +91 ' + phone, type: 'success' });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backText}>← Change Number</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Verify Code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit verification code sent to <Text style={styles.bold}>+91 {phone}</Text>
          </Text>

          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>✦ Test Code: 123456</Text>
          </View>
        </View>

        <View style={styles.otpRow}>
          {digits.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => { inputRefs.current[idx] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              autoFocus={idx === 0}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => submitOtp(digits.join(''))}
          disabled={digits.some((d) => !d) || loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#FAF7F2" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Enter</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
            <Text style={[styles.resendLink, timer > 0 && styles.resendDisabled]}>
              {timer > 0 ? `Resend in 00:${timer < 10 ? '0' + timer : timer}` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    padding: 24,
  },
  backButton: {
    paddingVertical: 10,
    marginBottom: 20,
  },
  backText: {
    color: '#1A365D',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  bold: {
    color: '#1A365D',
    fontWeight: '700',
  },
  testBadge: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 14,
  },
  testBadgeText: {
    color: '#1A365D',
    fontSize: 11,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#1A365D',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: '#D4AF37',
    backgroundColor: '#FAF7F0',
  },
  verifyButton: {
    backgroundColor: '#1A365D',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyButtonText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendLabel: {
    color: '#718096',
    fontSize: 13,
  },
  resendLink: {
    color: '#1A365D',
    fontSize: 13,
    fontWeight: '700',
  },
  resendDisabled: {
    color: '#A0AEC0',
    fontWeight: '500',
  },
});

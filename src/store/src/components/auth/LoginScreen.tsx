import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../app/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { useOnboarding } from '../../context/OnboardingContext';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, sendOtp, continueAsGuest } = useAuth();
  const { navigate } = useNavigation();
  const { showToast } = useToast();
  const { completeOnboarding } = useOnboarding();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const success = await loginWithGoogle();
    setLoading(false);
    if (success) {
      completeOnboarding();
      showToast({ message: 'Signed in with Google successfully!', type: 'success' });
      navigate('home');
    } else {
      showToast({ message: 'Google sign-in failed. Please try again.', type: 'error' });
    }
  };

  const handleSendOtp = async () => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) {
      showToast({ message: 'Please enter a valid 10-digit mobile number', type: 'error' });
      return;
    }
    setLoading(true);
    const res = await sendOtp(clean);
    setLoading(false);
    if (res.success) {
      showToast({ message: res.message, type: 'success' });
      navigate('otp', { phone: clean });
    } else {
      showToast({ message: res.message, type: 'error' });
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    completeOnboarding();
    showToast({ message: 'Exploring as Guest Patron', type: 'info' });
    navigate('home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandMark}>✦ VAYYARI ✦</Text>
        <Text style={styles.title}>Artisan Patron Login</Text>
        <Text style={styles.subtitle}>
          Sign in to access your curated wishlist, handloom orders, and exclusive master weaver drops.
        </Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} activeOpacity={0.85}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or mobile OTP</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCodeBadge}>
            <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="Mobile Number"
            placeholderTextColor="#A0AEC0"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TouchableOpacity style={styles.otpButton} onPress={handleSendOtp} activeOpacity={0.88}>
          {loading ? (
            <ActivityIndicator color="#FAF7F2" />
          ) : (
            <Text style={styles.otpButtonText}>Get OTP Code</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.guestLink} onPress={handleGuest}>
          <Text style={styles.guestText}>Continue as <Text style={styles.guestBold}>Guest Explorer →</Text></Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to Vayyari's Terms of Provenance & Privacy Policy.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  brandMark: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleText: {
    color: '#2D3748',
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#A0AEC0',
    fontSize: 11,
    paddingHorizontal: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  countryCodeBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E0',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A365D',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A365D',
    fontWeight: '600',
    letterSpacing: 1,
  },
  otpButton: {
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
  otpButtonText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    gap: 14,
    paddingBottom: 10,
  },
  guestLink: {
    paddingVertical: 6,
  },
  guestText: {
    color: '#4A5568',
    fontSize: 14,
  },
  guestBold: {
    color: '#1A365D',
    fontWeight: '700',
  },
  termsText: {
    color: '#A0AEC0',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});

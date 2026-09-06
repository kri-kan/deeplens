import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { usePermissions } from '../../context/PermissionsContext';
import { PermissionPrimeModal } from '../permissions/PermissionPrimeModal';
import { useToast } from '../../context/ToastContext';

export const StepLocation: React.FC = () => {
  const { nextStep, setLocation } = useOnboarding();
  const {
    currentLocation,
    isLocationPrimingOpen,
    openLocationPriming,
    closeLocationPriming,
    requestLocationPermission,
    setManualPincode,
  } = usePermissions();
  const { showToast } = useToast();

  const [pincodeInput, setPincodeInput] = useState(currentLocation?.pincode || '500081');
  const [loading, setLoading] = useState(false);

  const handleLocationClick = () => {
    openLocationPriming();
  };

  const handleLocationConfirm = async () => {
    setLoading(true);
    const loc = await requestLocationPermission();
    setLoading(false);
    if (loc) {
      setPincodeInput(loc.pincode);
      setLocation(loc.pincode, loc.city);
      showToast({ message: `Delivering to ${loc.city} (${loc.transitDays}-day express)`, type: 'success' });
    }
  };

  const handlePincodeSubmit = async () => {
    if (pincodeInput.length !== 6) {
      showToast({ message: 'Please enter a 6-digit pincode', type: 'error' });
      return;
    }
    setLoading(true);
    const loc = await setManualPincode(pincodeInput);
    setLoading(false);
    if (loc) {
      setLocation(loc.pincode, loc.city);
      showToast({ message: `Location verified: ${loc.city}`, type: 'success' });
      nextStep();
    }
  };

  return (
    <View style={styles.container}>
      <PermissionPrimeModal
        type="location"
        visible={isLocationPrimingOpen}
        onConfirm={handleLocationConfirm}
        onCancel={closeLocationPriming}
      />

      <View style={styles.headerArea}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>📍</Text>
        </View>
        <Text style={styles.title}>Delivery Region</Text>
        <Text style={styles.subtitle}>
          We check courier speeds, handloom dispatch routes, and same-day packaging availability for your area.
        </Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.autoLocationButton} onPress={handleLocationClick} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#1A365D" />
          ) : (
            <>
              <Text style={styles.autoLocationIcon}>⌖</Text>
              <Text style={styles.autoLocationText}>Use Current Device Location</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or enter manually</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit Pincode"
            placeholderTextColor="#A0AEC0"
            keyboardType="numeric"
            maxLength={6}
            value={pincodeInput}
            onChangeText={setPincodeInput}
          />
        </View>

        {currentLocation && (
          <View style={styles.detectedBadge}>
            <Text style={styles.detectedTitle}>✦ {currentLocation.city}, {currentLocation.state}</Text>
            <Text style={styles.detectedSubtitle}>Estimated delivery: {currentLocation.transitDays} business days via {currentLocation.courier}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={handlePincodeSubmit} activeOpacity={0.88}>
        <Text style={styles.continueButtonText}>Confirm & Continue</Text>
      </TouchableOpacity>
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
  headerArea: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6EBF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  autoLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  autoLocationIcon: {
    fontSize: 18,
    color: '#1A365D',
    fontWeight: 'bold',
  },
  autoLocationText: {
    color: '#1A365D',
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#A0AEC0',
    fontSize: 12,
    paddingHorizontal: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A365D',
    textAlign: 'center',
    letterSpacing: 2,
  },
  detectedBadge: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  detectedTitle: {
    color: '#1A365D',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  detectedSubtitle: {
    color: '#718096',
    fontSize: 11,
    lineHeight: 16,
  },
  continueButton: {
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
  continueButtonText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
});

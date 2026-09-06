import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { usePermissions } from '../../context/PermissionsContext';
import { PermissionPrimeModal } from '../permissions/PermissionPrimeModal';
import { useToast } from '../../context/ToastContext';

export const StepNotifications: React.FC = () => {
  const { nextStep, setNotificationsOptIn } = useOnboarding();
  const {
    isNotificationPrimingOpen,
    openNotificationPriming,
    closeNotificationPriming,
    requestNotificationPermission,
  } = usePermissions();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleNotifyClick = () => {
    openNotificationPriming();
  };

  const handleConfirm = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    setLoading(false);
    setNotificationsOptIn(granted);
    if (granted) {
      showToast({ message: 'Notifications enabled for artisan drops!', type: 'success' });
    }
    nextStep();
  };

  const handleSkip = () => {
    setNotificationsOptIn(false);
    nextStep();
  };

  return (
    <View style={styles.container}>
      <PermissionPrimeModal
        type="notifications"
        visible={isNotificationPrimingOpen}
        onConfirm={handleConfirm}
        onCancel={closeNotificationPriming}
      />

      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🔔</Text>
        </View>
        <Text style={styles.eyebrow}>STEP 4 OF 5</Text>
        <Text style={styles.title}>Artisan Drop Alerts</Text>
        <Text style={styles.subtitle}>
          Traditional loom weavers produce small batches of 2 to 10 sarees per weave. Enable alerts to get access before public releases.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.previewTitle}>✦ EXCLUSIVE ACCESS</Text>
        </View>

        <View style={styles.benefitRow}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.benefitText}>Early notification for limited GI-tagged Kanjivaram and Banarasi drops</Text>
        </View>

        <View style={styles.benefitRow}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.benefitText}>Real-time dispatch, transit, and out-for-delivery updates</Text>
        </View>

        <View style={styles.benefitRow}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.benefitText}>Special VIP invitations to master weaver live weaving sessions</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNotifyClick} activeOpacity={0.88}>
          {loading ? (
            <ActivityIndicator color="#FAF7F2" />
          ) : (
            <Text style={styles.primaryButtonText}>Turn on Notifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Maybe Later</Text>
        </TouchableOpacity>
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF7F0',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  eyebrow: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
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
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginVertical: 16,
  },
  cardHeader: {
    marginBottom: 14,
  },
  previewTitle: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkIcon: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 10,
    marginTop: 1,
  },
  benefitText: {
    color: '#2D3748',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '600',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { usePermissions } from '../../context/PermissionsContext';

interface Props {
  type: 'location' | 'notifications';
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PermissionPrimeModal: React.FC<Props> = ({ type, visible, onConfirm, onCancel }) => {
  if (!visible) return null;

  const isLocation = type === 'location';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>{isLocation ? '📍' : '🔔'}</Text>
          </View>

          <Text style={styles.title}>
            {isLocation ? 'Accurate Delivery Timelines' : 'Exclusive Artisan Drops'}
          </Text>

          <Text style={styles.description}>
            {isLocation
              ? 'Vayyari uses your location to verify express courier coverage, show real-time 2-day delivery estimates, and auto-populate your delivery pincode.'
              : 'Be the first to know when master weavers release limited-edition handloom batches, and receive real-time order tracking alerts.'}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{isLocation ? 'Enter Pincode' : 'Maybe Later'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmText}>{isLocation ? 'Enable Location' : 'Allow Alerts'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FAF7F2',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A365D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelText: {
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1A365D',
    alignItems: 'center',
  },
  confirmText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '700',
  },
});

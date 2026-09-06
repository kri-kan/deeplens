import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { usePWA } from '../../context/PWAContext';

export const IosInstallGuideModal: React.FC = () => {
  const { showIosGuide, setShowIosGuide } = usePWA();

  if (!showIosGuide) return null;

  return (
    <Modal visible={showIosGuide} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Install Vayyari on iOS</Text>
          <Text style={styles.description}>
            Add Vayyari to your Home Screen for full-screen browsing and instant drop notifications:
          </Text>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>1.</Text>
            <Text style={styles.stepText}>Tap the <Text style={styles.bold}>Share</Text> button in your Safari navigation bar below (square with arrow).</Text>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>2.</Text>
            <Text style={styles.stepText}>Scroll down the share sheet and tap <Text style={styles.bold}>'Add to Home Screen'</Text> ⊞.</Text>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>3.</Text>
            <Text style={styles.stepText}>Tap <Text style={styles.bold}>'Add'</Text> in the top right corner.</Text>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={() => setShowIosGuide(false)}>
            <Text style={styles.doneText}>Got It</Text>
          </TouchableOpacity>
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
  modal: {
    backgroundColor: '#FAF7F2',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepNum: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D4AF37',
    width: 24,
  },
  stepText: {
    fontSize: 14,
    color: '#2D3748',
    flex: 1,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#1A365D',
  },
  doneButton: {
    backgroundColor: '#1A365D',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  doneText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
});

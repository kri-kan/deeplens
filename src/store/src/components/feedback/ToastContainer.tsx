import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useToast } from '../../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((t) => (
        <View key={t.id} style={[styles.toast, t.type === 'error' ? styles.errorToast : styles.successToast]}>
          <Text style={styles.icon}>{t.type === 'error' ? '⚠' : '✦'}</Text>
          <Text style={styles.message}>{t.message}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 99999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 420,
  },
  successToast: {
    backgroundColor: '#1A365D',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  errorToast: {
    backgroundColor: '#742A2A',
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  icon: {
    color: '#D4AF37',
    fontSize: 16,
    marginRight: 10,
  },
  message: {
    color: '#FAF7F2',
    fontSize: 13,
    fontWeight: '600',
  },
});

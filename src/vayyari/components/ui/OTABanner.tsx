import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Surface, Text, ProgressBar, IconButton, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOTAUpdate } from '@/hooks/useOTAUpdate';

export function OTABanner() {
  const insets = useSafeAreaInsets();
  const { isDownloading, updateReady, newVersion, percent, bytesDownloaded, totalBytes } = useOTAUpdate();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  if (Platform.OS === 'web') return null;

  // Don't show if user dismissed this specific version's ready alert
  if (updateReady && dismissedVersion === newVersion) return null;

  if (!isDownloading && !updateReady) return null;

  const mbDownloaded = (bytesDownloaded / (1024 * 1024)).toFixed(1);
  const mbTotal = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlayContainer,
        {
          top: Math.max(insets.top + 8, 16),
        },
      ]}
    >
      <Surface style={[styles.bannerContainer, updateReady ? styles.readyBorder : styles.downloadingBorder]} elevation={4}>
        {isDownloading ? (
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={styles.iconWrapper}>
                <ActivityIndicator size={20} color="#10B981" />
              </View>
              <View style={styles.textContainer}>
                <Text variant="labelLarge" style={styles.titleText}>
                  Downloading Vayyari v{newVersion || 'update'}...
                </Text>
                <Text variant="bodySmall" style={styles.detailText}>
                  {percent}% completed ({mbDownloaded} MB / {mbTotal} MB)
                </Text>
              </View>
            </View>
            <ProgressBar
              progress={Math.max(0.05, (percent || 0) / 100)}
              color="#10B981"
              style={styles.progressBar}
            />
          </View>
        ) : updateReady ? (
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={[styles.iconWrapper, styles.readyIconWrapper]}>
                <Ionicons name="sparkles" size={20} color="#F59E0B" />
              </View>
              <View style={styles.textContainer}>
                <Text variant="labelLarge" style={styles.readyTitleText}>
                  ✨ Update v{newVersion} Ready!
                </Text>
                <Text variant="bodySmall" style={styles.readyDetailText}>
                  Swipe away and reopen Vayyari to activate.
                </Text>
              </View>
              <IconButton
                icon="close"
                size={18}
                iconColor="#9CA3AF"
                style={styles.closeButton}
                onPress={() => setDismissedVersion(newVersion || 'current')}
                accessibilityLabel="Dismiss update notification"
              />
            </View>
          </View>
        ) : null}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
  },
  bannerContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  downloadingBorder: {
    borderColor: '#059669',
  },
  readyBorder: {
    borderColor: '#F59E0B',
  },
  content: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  readyIconWrapper: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  detailText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  readyTitleText: {
    color: '#FEF3C7',
    fontWeight: '700',
    fontSize: 13,
  },
  readyDetailText: {
    color: '#FCD34D',
    fontSize: 11,
    marginTop: 2,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 8,
  },
  closeButton: {
    margin: 0,
    padding: 0,
  },
});

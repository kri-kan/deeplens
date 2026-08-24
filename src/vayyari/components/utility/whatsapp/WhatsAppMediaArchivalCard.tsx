import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Button,
  Chip,
  IconButton,
  Surface,
  useTheme,
  ActivityIndicator,
  Snackbar,
  Portal,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { whatsappService } from '@/services/whatsappService';
import { appSettingsService, DEFAULT_WHATSAPP_RETENTION_SETTING } from '@/services/app-settings.service';
import { BentoCard } from '@/components/ui/BentoCard';

interface WhatsAppMediaArchivalCardProps {
  onArchivalComplete?: () => void;
  style?: any;
}

export const WhatsAppMediaArchivalCard: React.FC<WhatsAppMediaArchivalCardProps> = ({
  onArchivalComplete,
  style,
}) => {
  const theme = useTheme();
  const router = useRouter();

  const [retentionDays, setRetentionDays] = useState<number>(100);
  const [loadingRetention, setLoadingRetention] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchRetentionDays = useCallback(async () => {
    try {
      setLoadingRetention(true);
      const settings = await appSettingsService.getAll();
      let foundDays: number | null = null;

      for (const section of Object.values(settings)) {
        const item = section.find((s) => s.key === 'whatsapp.media.retention_days');
        if (item && item.value) {
          const parsed = parseInt(item.value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            foundDays = parsed;
            break;
          }
        }
      }

      setRetentionDays(foundDays ?? 100);
    } catch (err) {
      console.warn('Failed to fetch retention days setting:', err);
      setRetentionDays(100);
    } finally {
      setLoadingRetention(false);
    }
  }, []);

  useEffect(() => {
    fetchRetentionDays();
  }, [fetchRetentionDays]);

  const handleRunArchival = () => {
    Alert.alert(
      'Run Media Archival',
      `Are you sure you want to trigger manual media archival now?\n\nRaw unpromoted WhatsApp media older than ${retentionDays} days will be archived and purged from storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Archival',
          style: 'destructive',
          onPress: executeArchival,
        },
      ]
    );
  };

  const executeArchival = async () => {
    setRunning(true);
    try {
      const response = await whatsappService.archiveExpiredMedia();
      const count = response?.archivedCount ?? 0;
      const successMsg = response?.message || `Archival complete: ${count} expired media file(s) processed.`;
      setToastMessage(successMsg);
      onArchivalComplete?.();
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to execute media archival.';
      Alert.alert('Archival Error', errorMsg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <BentoCard surfaceLevel="surfaceContainerLowest" style={[styles.card, style]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor:
                    (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
                },
              ]}
            >
              <IconButton
                icon="archive-clock-outline"
                size={22}
                iconColor={theme.colors.primary}
                style={{ margin: 0 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.title}>
                Media Lifecycle & Auto-Archive
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                WhatsApp Media Retention Policy
              </Text>
            </View>
          </View>
          <IconButton
            icon="cog-outline"
            size={20}
            iconColor={theme.colors.outline}
            onPress={() => router.push('/modal')}
            accessibilityLabel="Configure Retention in Settings"
          />
        </View>

        {/* Metrics & Policy Status Grid */}
        <View style={styles.metricsGrid}>
          {/* Retention Period Block */}
          <Surface
            elevation={0}
            style={[
              styles.metricBlock,
              {
                backgroundColor:
                  (theme.colors as any).surfaceContainerLow || theme.colors.surface,
              },
            ]}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              RETENTION PERIOD
            </Text>
            <View style={styles.retentionRow}>
              {loadingRetention ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text variant="headlineSmall" style={[styles.retentionValue, { color: theme.colors.primary }]}>
                  {retentionDays}
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}> days</Text>
                </Text>
              )}
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.outline, fontSize: 11 }}>
              Raw unpromoted media TTL
            </Text>
          </Surface>

          {/* Auto-Archive Status Block */}
          <Surface
            elevation={0}
            style={[
              styles.metricBlock,
              {
                backgroundColor:
                  (theme.colors as any).surfaceContainerLow || theme.colors.surface,
              },
            ]}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              POLICY STATUS
            </Text>
            <View style={{ marginVertical: 4 }}>
              <Chip
                icon="check-circle"
                compact
                style={{ backgroundColor: '#25D36622', height: 26, alignSelf: 'flex-start' }}
                textStyle={{ color: '#25D366', fontWeight: '700', fontSize: 11 }}
              >
                Auto-Archive Active
              </Chip>
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.outline, fontSize: 11 }}>
              Ineligible media purged automatically
            </Text>
          </Surface>
        </View>

        {/* Policy Description Summary */}
        <View
          style={[
            styles.policyBanner,
            {
              backgroundColor:
                (theme.colors as any).surfaceContainerHigh || theme.colors.surfaceVariant,
            },
          ]}
        >
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
            WhatsApp media linked to catalog products is permanently preserved. Unlinked/unpromoted raw media older than{' '}
            <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>{retentionDays} days</Text> is archived.
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            icon="archive-arrow-down"
            loading={running}
            disabled={running}
            onPress={handleRunArchival}
            style={styles.archiveButton}
            contentStyle={styles.archiveButtonContent}
          >
            {running ? 'Archiving Expired Media...' : 'Run Media Archival'}
          </Button>
        </View>
      </BentoCard>

      {/* Progress / Result Toast */}
      <Portal>
        <Snackbar
          visible={Boolean(toastMessage)}
          onDismiss={() => setToastMessage(null)}
          duration={4000}
          action={{
            label: 'OK',
            onPress: () => setToastMessage(null),
          }}
          style={{ backgroundColor: (theme.colors as any).inverseSurface || '#1E293B' }}
        >
          {toastMessage}
        </Snackbar>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricBlock: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    justifyContent: 'space-between',
  },
  retentionRow: {
    marginVertical: 4,
  },
  retentionValue: {
    fontWeight: '800',
  },
  policyBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  archiveButton: {
    flex: 1,
    borderRadius: 12,
  },
  archiveButtonContent: {
    height: 44,
  },
});

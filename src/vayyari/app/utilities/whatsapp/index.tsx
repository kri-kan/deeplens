import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  ActivityIndicator,
  Surface,
  IconButton,
  List,
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { waProcessorService, WaProcessorStatus } from '@/services/wa-processor.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';

export default function WhatsAppDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<WaProcessorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await waProcessorService.getStatus();
      setStatus(s);
    } catch (err: any) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const menuItems = [
    { title: 'Session Status', subtitle: 'Connection & QR Pairing', icon: 'qrcode-scan', route: '/utilities/whatsapp/session' },
    { title: 'Accounts Registry', subtitle: 'Manage multiple WhatsApp sessions', icon: 'card-account-details-outline', route: '/utilities/whatsapp-accounts' },
    { title: 'Chats Admin', subtitle: 'Manage individual chat tracking', icon: 'chat-processing-outline', route: '/utilities/whatsapp/chats' },
    { title: 'Groups Admin', subtitle: 'Control group processing', icon: 'account-group-outline', route: '/utilities/whatsapp/groups' },
    { title: 'Announcements Admin', subtitle: 'Manage community channels', icon: 'bullhorn-outline', route: '/utilities/whatsapp/announcements' },
    { title: 'Processing Settings', subtitle: 'Sync & Performance controls', icon: 'cog-outline', route: '/utilities/whatsapp/settings' },
  ];

  return (
    <ScreenWrapper title="WhatsApp Management">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        <Section title="System Overview">
          <Card style={styles.statusCard}>
            <Card.Content>
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: status?.status === 'connected' ? '#25D366' : status?.status === 'scanning' ? '#FFA726' : '#EF5350' }
                ]} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    {status?.status === 'connected' ? 'Service Connected' : status?.status === 'scanning' ? 'Awaiting Login' : 'Service Offline'}
                  </Text>
                  <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                    Tenant: {status?.tenant || 'Unknown'}
                  </Text>
                </View>
                <IconButton 
                  icon="chevron-right" 
                  onPress={() => router.push('/utilities/whatsapp/session')} 
                />
              </View>
            </Card.Content>
          </Card>
        </Section>

        <Section title="Administration">
          <Card style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <View key={item.route}>
                <List.Item
                  title={item.title}
                  description={item.subtitle}
                  left={props => <List.Icon {...props} icon={item.icon} />}
                  onPress={() => router.push(item.route as any)}
                />
                {i < menuItems.length - 1 && <Divider />}
              </View>
            ))}
          </Card>
        </Section>

        <Section title="History & Sync">
          <View style={styles.statsRow}>
            <StatBox label="Tracked Chats" value="—" color={theme.colors.primary} />
            <StatBox label="Active Groups" value="—" color={theme.colors.secondary} />
          </View>
        </Section>
      </ScrollView>
    </ScreenWrapper>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Surface style={styles.statBox} elevation={1}>
      <Text variant="displaySmall" style={{ color, fontWeight: 'bold' }}>{value}</Text>
      <Text variant="labelSmall" style={{ opacity: 0.5 }}>{label}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  statusCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  menuCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

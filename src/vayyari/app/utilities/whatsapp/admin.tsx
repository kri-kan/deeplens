import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  List,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';

export default function WhatsAppAdminScreen() {
  const theme = useTheme();
  const router = useRouter();

  const menuItems = [
    { title: 'Session Status', subtitle: 'Connection & QR Pairing', icon: 'qrcode-scan', route: '/utilities/whatsapp/session' },
    { title: 'Accounts Registry', subtitle: 'Manage multiple WhatsApp sessions', icon: 'card-account-details-outline', route: '/utilities/whatsapp-accounts' },
    { title: 'Chats Admin', subtitle: 'Manage individual chat tracking', icon: 'chat-processing-outline', route: '/utilities/whatsapp/chats' },
    { title: 'Groups Admin', subtitle: 'Control group processing', icon: 'account-group-outline', route: '/utilities/whatsapp/groups' },
    { title: 'Announcements Admin', subtitle: 'Manage community channels', icon: 'bullhorn-outline', route: '/utilities/whatsapp/announcements' },
    { title: 'Processing Settings', subtitle: 'Sync & Performance controls', icon: 'cog-outline', route: '/utilities/whatsapp/settings' },
  ];

  return (
    <ScreenWrapper title="WhatsApp Administration">
      <ScrollView contentContainerStyle={styles.container}>
        <Section title="Management Tools">
          <Card style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <React.Fragment key={item.route}>
                <List.Item
                  title={item.title}
                  description={item.subtitle}
                  left={props => <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />}
                  right={props => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => router.push(item.route as any)}
                  titleStyle={styles.itemTitle}
                />
                {i < menuItems.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Card>
        </Section>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Vayyari WhatsApp Processor v2.0
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  menuCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
    overflow: 'hidden',
  },
  itemTitle: {
    fontWeight: '700',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    opacity: 0.3,
  }
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { GridMenu } from '@/components/utility/GridMenu';

interface UtilityItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  color?: string;
}

const OPERATIONAL_UTILITIES: UtilityItem[] = [
  { id: 'gen-id', title: 'Generate ID', icon: 'identifier', route: '/utilities/order-id-generator', color: '#6200ee' },
  { id: 'customers', title: 'Customers', icon: 'account-group', route: '/utilities/customer-management', color: '#3f51b5' },
  { id: 'stub3', title: 'Reserved', icon: 'clock-outline', route: '', color: '#999' },
];

const PRODUCT_UTILITIES: UtilityItem[] = [
  { id: 'view-catalog', title: 'Catalog', icon: 'format-list-bulleted', route: '/utilities/product-list', color: '#6200ee' },
  { id: 'create-product', title: 'Create', icon: 'plus-box', route: '/utilities/create-product', color: '#00a86b' },
  { id: 'merge-products', title: 'Merge', icon: 'call-merge', route: '', color: '#999' },
];

const SYSTEM_UTILITIES: UtilityItem[] = [
  { id: 'system-dashboard', title: 'System', icon: 'monitor-dashboard', route: '/utilities/system-dashboard', color: '#607D8B' },
  { id: 'master-data', title: 'Master Data', icon: 'database-settings', route: '/system/master-data', color: '#673AB7' },
  { id: 'media-settings', title: 'Media', icon: 'file-image-outline', route: '/utilities/media-settings', color: '#ff5722' },
  { id: 'insta-explorer', title: 'Explorer', icon: 'instagram', route: '/utilities/instagram-explorer', color: '#E1306C' },
  { id: 'competitor-scraper', title: 'Sync', icon: 'cloud-sync', route: '/utilities/instagram-scraper', color: '#6200ee' },
  { id: 'quick-links', title: 'Links', icon: 'link-variant', route: '/utilities/quick-links', color: '#2196F3' },
];

const COMMUNICATION_UTILITIES: UtilityItem[] = [
  { id: 'broadcast', title: 'WA communications', icon: 'whatsapp', route: '/utilities/communication-management', color: '#25D366' },
  { id: 'campaigns', title: 'Campaigns', icon: 'bullhorn-variant', route: '', color: '#FF9800' },
];

export default function UtilityScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper 
      title="Utilities" 
      actions={
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
      }
      contentContainerStyle={styles.content}
    >
      <Section title="Business" style={styles.section}>
        <GridMenu items={OPERATIONAL_UTILITIES} />
      </Section>

      <Section title="Product" style={styles.section}>
        <GridMenu items={PRODUCT_UTILITIES} />
      </Section>

      <Section title="System" style={styles.section}>
        <GridMenu items={SYSTEM_UTILITIES} />
      </Section>

      <Section title="Communications" style={styles.section}>
        <GridMenu items={COMMUNICATION_UTILITIES} />
      </Section>

      <Section title="Business Insights" style={styles.section}>
        <View style={styles.emptyGridPlaceholder}>
           <Text variant="bodySmall" style={{ opacity: 0.3 }}>More utilities coming soon...</Text>
        </View>
      </Section>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  emptyGridPlaceholder: {
    height: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

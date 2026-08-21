import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { GridMenu } from '@/components/utility/GridMenu';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/types/authorization';

interface UtilityItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  color?: string;
  permission?: string;
}

const OPERATIONAL_UTILITIES: UtilityItem[] = [
  { id: 'gen-id', title: 'Generate ID', icon: 'identifier', route: '/utilities/order-id-generator', color: '#6200ee', permission: PERMISSIONS.ORDERS_VIEW },
  { id: 'customers', title: 'Customers', icon: 'account-group', route: '/utilities/customer-management', color: '#3f51b5', permission: PERMISSIONS.CUSTOMERS_VIEW },
];

const PRODUCT_UTILITIES: UtilityItem[] = [
  { id: 'view-catalog', title: 'Catalog', icon: 'format-list-bulleted', route: '/utilities/product-list', color: '#6200ee', permission: PERMISSIONS.CATALOG_VIEW },
  { id: 'create-product', title: 'Create', icon: 'plus-box', route: '/utilities/create-product', color: '#00a86b', permission: PERMISSIONS.CATALOG_CREATE },
];

const SYSTEM_UTILITIES: UtilityItem[] = [
  { id: 'system-dashboard', title: 'System', icon: 'monitor-dashboard', route: '/utilities/system-dashboard', color: '#607D8B', permission: PERMISSIONS.SYSTEM_DASHBOARD_VIEW },
  { id: 'master-data', title: 'Master Data', icon: 'database-settings', route: '/system/master-data', color: '#673AB7', permission: PERMISSIONS.SYSTEM_MASTER_DATA_EDIT },
  { id: 'media-settings', title: 'Media', icon: 'file-image-outline', route: '/utilities/media-settings', color: '#ff5722', permission: PERMISSIONS.SYSTEM_MEDIA_RULES_EDIT },
  { id: 'insta-explorer', title: 'Explorer', icon: 'instagram', route: '/utilities/instagram-explorer', color: '#E1306C', permission: PERMISSIONS.INSTAGRAM_VIEW },
  { id: 'youtube-dashboard', title: 'YouTube', icon: 'youtube', route: '/utilities/youtube-dashboard', color: '#FF0000', permission: PERMISSIONS.CATALOG_VIEW },
  { id: 'quick-links', title: 'Links', icon: 'link-variant', route: '/utilities/quick-links', color: '#2196F3', permission: PERMISSIONS.SYSTEM_DASHBOARD_VIEW },
  { id: 'whatsapp-mgmt', title: 'WhatsApp', icon: 'whatsapp', route: '/utilities/whatsapp', color: '#25D366', permission: PERMISSIONS.WHATSAPP_VIEW },
  { id: 'playground', title: 'Playground', icon: 'test-tube', route: '/system/playground', color: '#9C27B0', permission: PERMISSIONS.SYSTEM_DASHBOARD_VIEW },
];

const COMMUNICATION_UTILITIES: UtilityItem[] = [
  { id: 'campaigns', title: 'Campaigns', icon: 'bullhorn-variant', route: '/utilities/communication-management', color: '#FF9800', permission: PERMISSIONS.WHATSAPP_BROADCAST },
];

const ADMIN_UTILITIES: UtilityItem[] = [
  { id: 'user-directory', title: 'User Directory', icon: 'account-multiple-outline', route: '/system/users', color: '#6200ee', permission: PERMISSIONS.USERS_VIEW },
  { id: 'roles-access', title: 'Roles & Access', icon: 'shield-account-outline', route: '/system/roles', color: '#00897B', permission: PERMISSIONS.ROLES_MANAGE },
];

/**
 * UtilityScreen Component
 * 
 * Serves as the central hub for all DeepLens operational, system, and administrative utilities.
 * Filters utility tiles dynamically according to user capabilities and permissions.
 * Includes a swipe-right gesture detector that navigates to the AI assistant.
 */
export default function UtilityScreen() {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const filterItems = (items: UtilityItem[]) => {
    if (isSuperAdmin) return items;
    return items.filter(item => !item.permission || hasPermission(item.permission));
  };

  const operationalItems = filterItems(OPERATIONAL_UTILITIES);
  const productItems = filterItems(PRODUCT_UTILITIES);
  const systemItems = filterItems(SYSTEM_UTILITIES);
  const communicationItems = filterItems(COMMUNICATION_UTILITIES);
  const adminItems = filterItems(ADMIN_UTILITIES);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX(40)
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onEnd((e) => {
      // Swipe right means finger moves from left to right (translationX > 0)
      if (e.translationX > 50) {
        router.push('/ai');
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1 }}>
        <ScreenWrapper 
          title="Utilities" 
          actions={
            <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
          }
          contentContainerStyle={styles.content}
        >
          {/* Administration & Access Section */}
          {adminItems.length > 0 && (
            <Section title="Administration & Access" style={styles.section}>
              <GridMenu items={adminItems} />
            </Section>
          )}

          {/* Operational / Business Section */}
          {operationalItems.length > 0 && (
            <Section title="Business" style={styles.section}>
              <GridMenu items={operationalItems} />
            </Section>
          )}

          {/* Product Management Section */}
          {productItems.length > 0 && (
            <Section title="Product" style={styles.section}>
              <GridMenu items={productItems} />
            </Section>
          )}

          {/* System Section */}
          {systemItems.length > 0 && (
            <Section title="System" style={styles.section}>
              <GridMenu items={systemItems} />
            </Section>
          )}

          {/* Communications Section */}
          {communicationItems.length > 0 && (
            <Section title="Communications" style={styles.section}>
              <GridMenu items={communicationItems} />
            </Section>
          )}

          <Section title="Business Insights" style={styles.section}>
            <View style={styles.emptyGridPlaceholder}>
               <Text variant="bodySmall" style={{ opacity: 0.3 }}>More utilities coming soon...</Text>
            </View>
          </Section>
        </ScreenWrapper>
      </View>
    </GestureDetector>
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

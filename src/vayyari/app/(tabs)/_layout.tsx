import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CustomTabBar } from '@/components/CustomTabBar';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/types/authorization';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canViewCatalog = isSuperAdmin || hasPermission(PERMISSIONS.CATALOG_VIEW);
  const canCreateCatalog = isSuperAdmin || hasPermission(PERMISSIONS.CATALOG_CREATE);
  const canViewOrders = isSuperAdmin || hasPermission(PERMISSIONS.ORDERS_VIEW);
  const canViewInsights = isSuperAdmin || hasPermission(PERMISSIONS.SYSTEM_DASHBOARD_VIEW) || hasPermission(PERMISSIONS.REPORTS_VIEW);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Utility',
          tabBarIcon: () => 'tools'
        }} 
      />
      <Tabs.Screen 
        name="studio" 
        options={{ 
          title: 'Studio',
          tabBarIcon: () => 'view-grid',
          href: canViewCatalog ? undefined : null,
        }} 
      />
      <Tabs.Screen 
        name="new" 
        options={{ 
          title: 'New',
          tabBarIcon: () => 'plus',
          href: canCreateCatalog ? undefined : null,
        }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{ 
          title: 'Orders',
          tabBarIcon: () => 'package-variant',
          href: canViewOrders ? undefined : null,
        }} 
      />
      <Tabs.Screen 
        name="insights" 
        options={{ 
          title: 'Insights',
          tabBarIcon: () => 'chart-line',
          href: canViewInsights ? undefined : null,
        }} 
      />
    </Tabs>
  );
}

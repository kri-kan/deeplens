import { Tabs } from 'expo-router';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CustomTabBar } from '@/components/CustomTabBar';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/types/authorization';
import { DrawerContext } from '@/utils/DrawerContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { width } = useWindowDimensions();

  // Shared value: -width = Utilities closed, 0 = Utilities open
  const translateX = useSharedValue(-width);

  const canViewCatalog = isSuperAdmin || hasPermission(PERMISSIONS.CATALOG_VIEW);
  const canCreateCatalog = isSuperAdmin || hasPermission(PERMISSIONS.CATALOG_CREATE);
  const canViewOrders = isSuperAdmin || hasPermission(PERMISSIONS.ORDERS_VIEW);
  const canViewInsights = isSuperAdmin || hasPermission(PERMISSIONS.SYSTEM_DASHBOARD_VIEW) || hasPermission(PERMISSIONS.REPORTS_VIEW);

  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value + width }],
    };
  });

  return (
    <DrawerContext.Provider value={{ translateX, width }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => {
          const routeName = props.state.routes[props.state.index]?.name;
          if (routeName === 'index') {
            return (
              <Animated.View style={[tabBarAnimatedStyle, { overflow: 'visible' }]}>
                <CustomTabBar {...props} />
              </Animated.View>
            );
          }
          return <CustomTabBar {...props} />;
        }}
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
    </DrawerContext.Provider>
  );
}

import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
          tabBarIcon: () => 'view-grid' // Injecting string name mapping directly back to UI
        }} 
      />
      <Tabs.Screen 
        name="new" 
        options={{ 
          title: 'New',
          tabBarIcon: () => 'plus'
        }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{ 
          title: 'Orders',
          tabBarIcon: () => 'package-variant'
        }} 
      />
      <Tabs.Screen 
        name="insights" 
        options={{ 
          title: 'Insights',
          tabBarIcon: () => 'chart-line'
        }} 
      />
    </Tabs>
  );
}

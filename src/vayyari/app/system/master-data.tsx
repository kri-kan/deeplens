import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { GridMenu } from '@/components/utility/GridMenu';

const MASTER_DATA_ITEMS = [
  { 
    id: 'product-categories', 
    title: 'Product Categories', 
    icon: 'format-list-bulleted-type', 
    route: '/system/categories', 
    color: '#673AB7' 
  },
  { 
    id: 'vendors', 
    title: 'Vendors', 
    icon: 'storefront', 
    route: '/system/vendors', 
    color: '#FF9800' 
  },
  // You can add more master data items here later (e.g., Sizes, etc.)
];

export default function MasterDataHub() {
  const router = useRouter();

  return (
    <ScreenWrapper title="Master Data Hub">
      <Section 
        title="Inventory & Catalog" 
        subtitle="Manage the core definitions for your product catalog."
        style={styles.section}
      >
        <GridMenu 
          items={MASTER_DATA_ITEMS.map(item => ({
            ...item,
            onPress: () => router.push(item.route as any)
          }))} 
        />
      </Section>

      <Section 
        title="More Management Tools" 
        style={styles.section}
      >
        <View style={styles.placeholder}>
          <GridMenu 
            items={[
              { id: 'stub1', title: 'Customer Types', icon: 'account-cog', route: '', color: '#999' },
              { id: 'stub2', title: 'Location Data', icon: 'map-marker-radius', route: '', color: '#999' },
            ]}
          />
        </View>
      </Section>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  placeholder: {
    opacity: 0.4,
  }
});

import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Surface, Text, Appbar, Icon, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { BentoCard } from '@/components/ui/BentoCard';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 12;
const TILE_SIZE = (width - 32 - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

interface UtilityItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  color?: string;
}

const ORDER_UTILITIES: UtilityItem[] = [
  { id: 'gen-id', title: 'Generate ID', icon: 'identifier', route: '/utilities/order-id-generator', color: '#6200ee' },
  { id: 'stub2', title: 'Reserved', icon: 'clock-outline', route: '', color: '#999' },
  { id: 'stub3', title: 'Reserved', icon: 'clock-outline', route: '', color: '#999' },
];

export default function UtilityScreen() {
  const theme = useTheme();
  const router = useRouter();

  const renderGrid = (items: UtilityItem[]) => {
    return (
      <View style={styles.grid}>
        {items.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            onPress={() => item.route && router.push(item.route as any)}
            disabled={!item.route}
          >
            <BentoCard 
              style={[styles.tile, { width: TILE_SIZE, height: TILE_SIZE }]}
              surfaceLevel="surfaceContainerLow"
            >
              <View style={styles.tileContent}>
                <Icon source={item.icon} size={32} color={item.route ? item.color || theme.colors.primary : '#ccc'} />
                <Text variant="labelSmall" style={[styles.tileTitle, { color: item.route ? theme.colors.onSurface : '#999' }]} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            </BentoCard>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Content title="Utilities" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Order Utilities</Text>
        </View>
        
        {renderGrid(ORDER_UTILITIES)}

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Business Insights</Text>
        </View>
        {/* Placeholder for future rows */}
        <View style={styles.emptyGridPlaceholder}>
           <Text variant="bodySmall" style={{ opacity: 0.3 }}>More utilities coming soon...</Text>
        </View>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    opacity: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0, // Reset default bento margin
  },
  tileContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileTitle: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 11,
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

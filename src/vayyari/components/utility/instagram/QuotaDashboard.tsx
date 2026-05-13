import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Icon, useTheme } from 'react-native-paper';

interface QuotaDashboardProps {
  quota: any;
}

export const QuotaDashboard: React.FC<QuotaDashboardProps> = ({ quota }) => {
  const theme = useTheme();

  if (!quota) return null;

  return (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon source="gauge" size={20} color={theme.colors.primary} />
          <Text variant="titleSmall" style={styles.bold}>Quota Dashboard</Text>
        </View>
        <Text variant="labelSmall" style={styles.updatedText}>
          Updated {quota.lastUpdated ? new Date(quota.lastUpdated).toLocaleTimeString() : 'N/A'}
        </Text>
      </View>
      
      <View style={styles.grid}>
        <QuotaItem 
          value={quota.requestsInLastHour} 
          label="Last Hour" 
          color={theme.colors.primary} 
        />
        <QuotaItem 
          value={`${quota.metrics?.callCount || 0}%`} 
          label="App Usage" 
          color={theme.colors.secondary} 
        />
        <QuotaItem 
          value={quota.estimatedRemainingRequests} 
          label="Est. Left" 
          color={quota.estimatedRemainingRequests < 100 ? theme.colors.error : theme.colors.tertiary} 
        />
      </View>
    </Surface>
  );
};

const QuotaItem = ({ value, label, color }: { value: string | number; label: string; color: string }) => (
  <View style={styles.item}>
    <Text variant="headlineSmall" style={[styles.bold, { color }]}>
      {value}
    </Text>
    <Text variant="labelSmall">{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  updatedText: {
    opacity: 0.6,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  item: {
    alignItems: 'center',
  },
});

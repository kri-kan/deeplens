import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { CompactChip } from '@/components/ui/CompactChip';
import { MediaPreference } from '@/services/mediaSettingsService';

interface SettingRuleCardProps {
  item: MediaPreference;
  onPress: () => void;
}

export const SettingRuleCard: React.FC<SettingRuleCardProps> = ({ item, onPress }) => {
  const theme = useTheme();

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.meta}>
            <Text variant="titleMedium" style={styles.title}>
              {!item.category ? '🌐 Global System Default' : 
               !item.subCategory ? `📂 Category: ${item.category}` : 
               `📄 ${item.category} / ${item.subCategory}`}
            </Text>
            <Text variant="bodySmall" style={styles.retention}>
              Retention Tag: <Text style={[styles.bold, { color: theme.colors.primary }]}>{item.retention}</Text>
            </Text>
          </View>
          <Button mode="text" labelStyle={styles.manageLabel} onPress={onPress}>Manage</Button>
        </View>
        
        <View style={styles.chipRow}>
          {item.thumbnailSizes.map(size => (
            <CompactChip 
              key={size} 
              outline
              color={theme.colors.onSurfaceVariant}
              textStyle={{ fontSize: 9, fontWeight: 'bold' }}
            >
              {size.toUpperCase()}
            </CompactChip>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    flex: 1,
  },
  title: {
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  retention: {
    marginTop: 2,
    opacity: 0.7,
  },
  bold: {
    fontWeight: 'bold',
  },
  manageLabel: {
    fontSize: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  chip: {
    height: 24,
    borderRadius: 8,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  chipText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
});

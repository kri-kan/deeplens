import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Divider, Button } from 'react-native-paper';
import { SyncResult } from '../../../services/instagram.service';

interface SyncResultCardProps {
  result: SyncResult | null;
  onOpenExplorer: () => void;
}

export const SyncResultCard: React.FC<SyncResultCardProps> = ({ result, onOpenExplorer }) => {
  if (!result) return null;

  return (
    <Card style={styles.card}>
      <Card.Title
        title="Sync Complete"
        subtitle={`@${result.profile?.username}`}
        left={props => <IconButton {...props} icon="check-circle" iconColor="#66BB6A" />}
      />
      <Card.Content>
        <View style={styles.statsRow}>
          <StatBox label="Followers" value={(result.profile?.followersCount ?? 0).toLocaleString()} />
          <StatBox label="Posts" value={result.profile?.mediaCount ?? 0} />
          <StatBox label="New Posts" value={`+${result.newPosts ?? 0}`} color="#66BB6A" />
          <StatBox label="Refreshed" value={result.engagementUpdated ?? 0} />
        </View>

        <Divider style={styles.divider} />

        <Button
          mode="contained"
          onPress={onOpenExplorer}
          icon="eye"
        >
          Open in Explorer
        </Button>
      </Card.Content>
    </Card>
  );
};

const StatBox = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
  <View style={styles.statBox}>
    <Text variant="titleMedium" style={[styles.bold, color ? { color } : {}]}>
      {value}
    </Text>
    <Text variant="labelSmall">{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statBox: {
    alignItems: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
});

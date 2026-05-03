import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Button, useTheme } from 'react-native-paper';
import { CompactChip } from '@/components/ui/CompactChip';
import { TokenHealth } from '../../../services/instagram.service';

interface TokenHealthCardProps {
  health: TokenHealth | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export const TokenHealthCard: React.FC<TokenHealthCardProps> = ({
  health,
  loading,
  refreshing,
  onRefresh,
}) => {
  const theme = useTheme();

  const getChipStyle = () => {
    if (!health) return {};
    if (health.isExpired) return { backgroundColor: '#FF5252' };
    if (health.needsRefresh) return { backgroundColor: '#FFA726' };
    return { backgroundColor: '#66BB6A' };
  };

  const getLabel = () => {
    if (loading) return 'Checking token...';
    if (!health) return 'Token status unknown';
    if (health.isExpired) return '⚠ Token EXPIRED';
    if (health.needsRefresh) return `⚡ Refresh soon (${health.daysRemaining}d left)`;
    return `✓ Token valid · ${health.daysRemaining}d remaining`;
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Card.Content style={styles.content}>
        <View style={styles.row}>
          <IconButton icon="shield-key" size={20} />
          <View style={styles.meta}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              LONG ACCESS TOKEN STATUS
            </Text>
            <CompactChip
              color={health?.isExpired ? '#FF5252' : health?.needsRefresh ? '#FFA726' : '#66BB6A'}
              style={{ marginTop: 4 }}
              textStyle={{ color: 'white' }}
            >
              {getLabel()}
            </CompactChip>
          </View>
          <Button
            mode="text"
            compact
            loading={refreshing}
            disabled={refreshing || loading}
            onPress={onRefresh}
            icon="refresh"
          >
            Refresh
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
  content: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    flex: 1,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  chipText: {
    color: 'white',
    fontSize: 11,
  },
});

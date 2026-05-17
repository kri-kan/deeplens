import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  Switch,
  Button,
  useTheme,
  ActivityIndicator,
  Divider,
  List,
} from 'react-native-paper';
import { waProcessorService, ProcessingState } from '@/services/wa-processor.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

export default function WhatsAppSettingsScreen() {
  const theme = useTheme();
  const [state, setState] = useState<ProcessingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const s = await waProcessorService.fetchProcessingState();
      setState(s);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to fetch state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleTogglePause = async () => {
    if (!state) return;
    setUpdating(true);
    try {
      if (state.isPaused) {
        const newState = await waProcessorService.resumeProcessing();
        setState(newState);
      } else {
        const newState = await waProcessorService.pauseProcessing();
        setState(newState);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Action failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSync = async (key: keyof ProcessingState, value: boolean) => {
    if (!state) return;
    setUpdating(true);
    try {
      const payload = {
        trackChats: state.trackChats,
        trackGroups: state.trackGroups,
        trackAnnouncements: state.trackAnnouncements,
        [key]: value
      };
      const newState = await waProcessorService.updateSyncSettings(payload);
      setState(newState);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !state) {
    return (
      <ScreenWrapper title="Processing Settings">
        <ActivityIndicator style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Processing Settings">
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading && !!state} onRefresh={fetchState} />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">Processor Status</Text>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                  {state?.isPaused ? 'Processing is currently paused' : 'Processing is active'}
                </Text>
              </View>
              <Button 
                mode="contained" 
                onPress={handleTogglePause} 
                loading={updating}
                buttonColor={state?.isPaused ? theme.colors.primary : theme.colors.error}
              >
                {state?.isPaused ? 'Resume' : 'Pause'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={styles.sectionTitle}>Sync Configuration</Text>
        <Card style={styles.card}>
          <List.Item
            title="Track Individual Chats"
            description="Process messages from personal conversations"
            right={() => (
              <Switch 
                value={state?.trackChats} 
                onValueChange={(val) => handleUpdateSync('trackChats', val)}
                disabled={updating}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Track Groups"
            description="Process messages from joined groups"
            right={() => (
              <Switch 
                value={state?.trackGroups} 
                onValueChange={(val) => handleUpdateSync('trackGroups', val)}
                disabled={updating}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Track Announcements"
            description="Process messages from community channels"
            right={() => (
              <Switch 
                value={state?.trackAnnouncements} 
                onValueChange={(val) => handleUpdateSync('trackAnnouncements', val)}
                disabled={updating}
              />
            )}
          />
        </Card>

        {state?.pausedAt && (
          <Text variant="bodySmall" style={styles.timestamp}>
            Paused at: {new Date(state.pausedAt).toLocaleString()}
          </Text>
        )}
        {state?.resumedAt && (
          <Text variant="bodySmall" style={styles.timestamp}>
            Last resumed: {new Date(state.resumedAt).toLocaleString()}
          </Text>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    marginTop: 8,
    marginLeft: 4,
  },
  timestamp: {
    textAlign: 'center',
    opacity: 0.4,
    marginTop: 8,
  }
});

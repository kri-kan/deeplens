import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, ProgressBar, IconButton, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { systemJobsService, SystemJob } from '@/services/system-jobs.service';

export default function SystemDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [jobs, setJobs] = useState<SystemJob[]>([]);
  const [orphanedCount, setOrphanedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const fetchData = async () => {
    try {
      const [jobsData, count] = await Promise.all([
        systemJobsService.getJobs(),
        systemJobsService.getOrphanedMediaCount()
      ]);
      setJobs(jobsData);
      setOrphanedCount(count);
    } catch (error) {
      console.error('Failed to fetch system data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      await systemJobsService.triggerCleanup();
      await fetchData();
    } catch (error) {
      console.error('Cleanup failed', error);
    } finally {
      setCleaning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return theme.colors.primary;
      case 'Failed': return theme.colors.error;
      case 'Idle': return '#4CAF50';
      default: return theme.colors.outline;
    }
  };

  return (
    <ScreenWrapper 
      title="System Dashboard"
      contentContainerStyle={styles.container}
    >
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        <Section title="Media Integrity" style={styles.section}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <View>
                  <Text variant="titleMedium">Orphaned Assets</Text>
                  <Text variant="bodySmall" style={{ opacity: 0.6 }}>Unlinked media in database</Text>
                </View>
                <Text variant="headlineMedium" style={{ color: orphanedCount > 0 ? theme.colors.error : theme.colors.primary }}>
                  {orphanedCount}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <Button 
                mode="contained" 
                icon="broom" 
                onPress={handleCleanup}
                loading={cleaning}
                disabled={cleaning || orphanedCount === 0}
                style={styles.actionButton}
              >
                Trigger Cleanup
              </Button>
              <Text variant="bodySmall" style={styles.hint}>
                Moves orphaned references to the Deletion Log for manual review.
              </Text>
            </Card.Content>
          </Card>
        </Section>

        <Section title="Background Processes" style={styles.section}>
          {jobs.length === 0 && !loading && (
            <Text variant="bodyMedium" style={styles.emptyText}>No background jobs registered.</Text>
          )}
          
          {jobs.map(job => (
            <Card key={job.id} style={styles.jobCard}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={styles.jobHeader}>
                    <Text variant="titleMedium">{job.jobName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                      <Text style={styles.statusText}>{job.status}</Text>
                    </View>
                  </View>
                  <IconButton icon="play-circle-outline" onPress={() => {}} disabled={job.status === 'Running'} />
                </View>

                {job.status === 'Running' && (
                  <View style={styles.progressContainer}>
                    <ProgressBar progress={job.progressPct / 100} color={theme.colors.primary} style={styles.progressBar} />
                    <Text variant="bodySmall" style={styles.progressText}>{job.progressPct}%</Text>
                  </View>
                )}

                <View style={styles.jobFooter}>
                  <Text variant="bodySmall" style={styles.footerText}>
                    Last Run: {new Date(job.lastRunAt).toLocaleString()}
                  </Text>
                  {job.metadata && job.metadata.deletedCount !== undefined && (
                    <Text variant="bodySmall" style={styles.successText}>
                      Processed: {job.metadata.deletedCount}
                    </Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))}
          
          {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
        </Section>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    elevation: 2,
  },
  jobCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  actionButton: {
    borderRadius: 8,
  },
  hint: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.5,
    fontSize: 11,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'right',
    marginTop: 4,
    opacity: 0.7,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  footerText: {
    opacity: 0.5,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.3,
    marginTop: 40,
  }
});

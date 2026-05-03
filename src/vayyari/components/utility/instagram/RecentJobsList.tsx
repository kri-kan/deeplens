import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, ProgressBar, useTheme } from 'react-native-paper';

interface RecentJobsListProps {
  jobs: any[];
  queuedJobId: string | null;
}

export const RecentJobsList: React.FC<RecentJobsListProps> = ({ jobs, queuedJobId }) => {
  const theme = useTheme();

  if (jobs.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>RECENT SCRAPER JOBS</Text>
        <Chip textStyle={styles.chipText}>{jobs.length} Active</Chip>
      </View>
      {jobs.map((job) => (
        <Card 
          key={job.id} 
          style={[
            styles.card, 
            { borderLeftColor: job.id === queuedJobId ? theme.colors.primary : '#ccc' }
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.jobHeader}>
              <View>
                <Text variant="labelLarge" style={styles.bold}>@{job.username}</Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {job.status.toUpperCase()} · {job.target_count === 0 ? 'Full Profile' : `${job.target_count} Posts`}
                </Text>
              </View>
              {job.status === 'running' && <ActivityIndicator size="small" />}
            </View>
            
            <View style={styles.progressRow}>
              <Text variant="labelSmall">{job.scraped_count} Scraped</Text>
              <Text variant="labelSmall">
                {job.target_count > 0 ? `${Math.round((job.scraped_count / job.target_count) * 100)}%` : ''}
              </Text>
            </View>
            <ProgressBar 
              progress={job.target_count > 0 ? (job.scraped_count / job.target_count) : (job.status === 'running' ? 0.5 : 0)} 
              indeterminate={job.target_count === 0 && job.status === 'running'}
              color={theme.colors.primary} 
              style={styles.progressBar}
            />
          </Card.Content>
        </Card>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
  },
  chipText: {
    fontSize: 10,
  },
  card: {
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardContent: {
    paddingVertical: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});

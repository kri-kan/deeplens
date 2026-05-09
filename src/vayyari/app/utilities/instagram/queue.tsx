import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton, Button, SegmentedButtons, Chip, useTheme } from 'react-native-paper';
import { instagramService } from '@/services/instagram.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Stack, useRouter } from 'expo-router';

export default function QueueScreen() {
    const theme = useTheme();
    const router = useRouter();
    const [activeQueue, setActiveQueue] = useState<any[]>([]);
    const [jobHistory, setJobHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchQueue = useCallback(async () => {
        try {
            setLoading(true);
            const [active, history] = await Promise.all([
                instagramService.getActiveJobs(),
                instagramService.getJobHistory()
            ]);
            setActiveQueue(active);
            setJobHistory(history);
        } catch (err) {
            console.error('Failed to fetch queue', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [fetchQueue]);

    const healQueue = async () => {
        try {
            await instagramService.healQueue();
            fetchQueue();
        } catch (err) {
            console.error('Failed to heal queue', err);
        }
    };

    const deleteJob = async (jobId: string) => {
        try {
            await instagramService.deleteJob(jobId);
            fetchQueue();
        } catch (err) {
            console.error('Failed to delete job', err);
        }
    };

    const updatePriority = async (jobId: string, priority: number) => {
        try {
            await instagramService.updateJob(jobId, { priority });
            fetchQueue();
        } catch (err) {
            console.error('Failed to update priority', err);
        }
    };

    return (
        <ScreenWrapper title="Scraper Queue">
            <Stack.Screen options={{ 
                headerTitle: 'Scraper Queue',
                headerRight: () => <IconButton icon="autorenew" onPress={healQueue} />
            }} />

            <View style={styles.container}>
                <SegmentedButtons
                    value={showHistory ? 'history' : 'active'}
                    onValueChange={(v) => setShowHistory(v === 'history')}
                    buttons={[
                        { value: 'active', label: `Active (${activeQueue.length})` },
                        { value: 'history', label: 'History' },
                    ]}
                    style={styles.segmentedButtons}
                />
                
                <ScrollView style={styles.scroll}>
                    {!showHistory ? (
                        activeQueue.map((item) => (
                            <View key={item.id} style={styles.item}>
                                <View style={styles.itemMain}>
                                    <View style={styles.itemTitleRow}>
                                        <Text variant="titleSmall" style={styles.bold}>@{item.username}</Text>
                                        {item.priority > 1 && <Chip compact textStyle={styles.chipText} style={{ height: 20 }}>HIGH</Chip>}
                                    </View>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        {item.origin} • {item.jobType.toUpperCase()} • {item.scrapedCount || 0}/{item.targetCount === 0 ? 'All' : item.targetCount} Posts
                                    </Text>
                                </View>
                                <View style={styles.itemActions}>
                                    <View style={styles.nextRun}>
                                        <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                                            {item.status === 'running' ? 'RUNNING' : `Next: ${item.nextRunAt ? new Date(item.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ASAP'}`}
                                        </Text>
                                        {item.status === 'running' && item.startedAt && (
                                            <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>
                                                Started: {new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </Text>
                                        )}
                                    </View>
                                    <IconButton icon="arrow-up-bold-outline" size={18} onPress={() => updatePriority(item.id, 10)} />
                                    <IconButton icon="close" size={18} iconColor={theme.colors.error} onPress={() => deleteJob(item.id)} />
                                </View>
                            </View>
                        ))
                    ) : (
                        jobHistory.map((item) => (
                            <View key={item.id} style={[styles.item, { opacity: 0.8 }]}>
                                <View style={styles.itemMain}>
                                    <Text variant="labelMedium" style={styles.bold}>@{item.username}</Text>
                                    <Text variant="labelSmall">{item.jobType.toUpperCase()} • {item.status}</Text>
                                </View>
                                <View style={styles.historyMeta}>
                                    <Text variant="labelSmall" style={styles.bold}>
                                        {item.startedAt ? new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '??'} - {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    <Text variant="labelSmall" style={{ opacity: 0.7 }}>
                                        {new Date(item.completedAt).toLocaleDateString()}
                                        {item.startedAt && ` • ${Math.round((new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()) / 60000)}m`}
                                    </Text>
                                    <Text variant="labelSmall" style={styles.bold}>{item.scrapedCount} Posts</Text>
                                </View>
                            </View>
                        ))
                    )}
                    {((!showHistory && activeQueue.length === 0) || (showHistory && jobHistory.length === 0)) && !loading && (
                        <Text style={styles.emptyText}>Nothing to show</Text>
                    )}
                </ScrollView>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    scroll: {
        flex: 1,
    },
    bold: {
        fontWeight: 'bold',
    },
    segmentedButtons: {
        marginBottom: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    itemMain: {
        flex: 1,
    },
    itemTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    chipText: {
        fontSize: 8,
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextRun: {
        alignItems: 'flex-end',
        marginRight: 8,
    },
    historyMeta: {
        alignItems: 'flex-end',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        opacity: 0.5,
    },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator } from 'react-native-paper';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { fetchFailedItems, retryFailedItem, FailedItem } from '@/services/error-queue.service';
import { useRouter } from 'expo-router';

export default function ErrorQueueScreen() {
    const theme = useTheme();
    const router = useRouter();
    const [items, setItems] = useState<FailedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [retrying, setRetrying] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const data = await fetchFailedItems();
            setItems(data);
        } catch (e) {
            console.error("Failed to load error queue", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleRetry = async (groupId: string) => {
        setRetrying(groupId);
        try {
            await retryFailedItem(groupId);
            // Optimistically remove the item from the list
            setItems(prev => prev.filter(item => item.groupId !== groupId));
        } catch (e) {
            console.error("Failed to retry item", e);
        } finally {
            setRetrying(null);
        }
    };

    const renderItem = ({ item }: { item: FailedItem }) => (
        <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
                <Text variant="titleMedium" style={{ color: theme.colors.error, marginBottom: 8 }}>
                    {item.status.toUpperCase()}
                </Text>
                
                {item.groupName && (
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                        Group: {item.groupName}
                    </Text>
                )}
                
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Reason: {item.errorReason || "Unknown"}
                </Text>
                
                <View style={[styles.rawTextContainer, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
                    <Text variant="bodySmall" numberOfLines={3} style={{ color: theme.colors.onSurface }}>
                        {item.rawText}
                    </Text>
                </View>
                
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                    {new Date(item.updatedAt).toLocaleString()}
                </Text>
            </Card.Content>
            
            <Card.Actions>
                <Button 
                    mode="contained-tonal"
                    buttonColor={theme.colors.primaryContainer}
                    textColor={theme.colors.onPrimaryContainer}
                    onPress={() => handleRetry(item.groupId)}
                    loading={retrying === item.groupId}
                    disabled={retrying !== null}
                >
                    Retry Pipeline
                </Button>
            </Card.Actions>
        </Card>
    );

    return (
        <ScreenWrapper 
            title="Error Queue"
            onBack={() => router.back()}
        >
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                </View>
            ) : items.length === 0 ? (
                <View style={styles.center}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>
                        No failed items in the queue! 🎉
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.groupId}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        marginBottom: 16,
        elevation: 0, // No shadow, rely on background color
    },
    rawTextContainer: {
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
    }
});

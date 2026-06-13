import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Switch, SegmentedButtons, TextInput, Button, Divider, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useInstagramExplorer } from '@/hooks/useInstagramExplorer';

export default function ProfileSettingsScreen() {
    const { username } = useLocalSearchParams();
    const theme = useTheme();
    const router = useRouter();
    
    const {
        profileData,
        syncMode,
        setSyncMode,
        targetPostCount,
        setTargetPostCount,
        manualSync,
        deleteProfileData,
        toggleWatch,
        toggleOwn,
        loading,
        selectProfile,
    } = useInstagramExplorer();

    React.useEffect(() => {
        if (username) {
            selectProfile(username as string);
        }
    }, [username]);

    const profile = profileData?.profile;

    if (!profile && loading) {
        return (
            <ScreenWrapper title="Profile Settings">
                <View style={styles.center}>
                    <Text>Loading settings...</Text>
                </View>
            </ScreenWrapper>
        );
    }

    if (!profile) {
        return (
            <ScreenWrapper title="Profile Settings">
                <View style={styles.center}>
                    <Text>Profile not found.</Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper title="Profile Settings">
            <Stack.Screen options={{ headerTitle: `@${profile.username} Settings` }} />
            
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.toggleRow}>
                    <View>
                        <Text variant="labelLarge" style={styles.bold}>Watchlist Status</Text>
                        <Text variant="labelSmall" style={styles.helperText}>
                            {profile.isActive ? 'Active (Syncing)' : 'Paused (Ignored)'}
                        </Text>
                    </View>
                    <Switch 
                        value={profile.isActive} 
                        onValueChange={() => toggleWatch(profile.username, profile.isActive)} 
                    />
                </View>

                <View style={styles.toggleRow}>
                    <View>
                        <Text variant="labelLarge" style={styles.bold}>My Account</Text>
                        <Text variant="labelSmall" style={styles.helperText}>
                            {profile.isOwnAccount ? 'Flagged as Mine' : 'Competitor Account'}
                        </Text>
                    </View>
                    <Switch 
                        value={profile.isOwnAccount} 
                        onValueChange={() => toggleOwn(profile.username, profile.isOwnAccount)} 
                    />
                </View>

                <Divider style={styles.divider} />

                <Text variant="labelLarge" style={[styles.bold, styles.sectionTitle]}>Trigger Manual Sync</Text>
                <SegmentedButtons
                    value={syncMode}
                    onValueChange={v => setSyncMode(v as any)}
                    buttons={[
                        { value: 'recent', label: 'Recent', icon: 'clock-outline' },
                        { value: 'full', label: 'Full Profile', icon: 'all-inclusive' },
                    ]}
                    style={styles.segmentedButtons}
                />

                {syncMode === 'recent' && (
                    <TextInput
                        label="Number of posts"
                        value={targetPostCount}
                        onChangeText={setTargetPostCount}
                        keyboardType="numeric"
                        mode="outlined"
                        dense
                        style={styles.input}
                    />
                )}

                <Button 
                    mode="contained" 
                    onPress={manualSync} 
                    loading={loading}
                    icon="sync"
                    style={styles.syncButton}
                >
                    Run Scrape Now
                </Button>

                <Divider style={styles.dividerSmall} />
                <Text variant="labelSmall" style={styles.dangerTitle}>DANGER ZONE</Text>
                <Button 
                    mode="contained-tonal" 
                    buttonColor={theme.colors.errorContainer}
                    textColor={theme.colors.error}
                    icon="delete-forever"
                    onPress={deleteProfileData}
                    style={styles.deleteButton}
                >
                    Delete Profile Data
                </Button>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: 24,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bold: {
        fontWeight: 'bold',
    },
    toggleRow: {
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 12, 
        backgroundColor: 'rgba(0,0,0,0.05)', 
        paddingHorizontal: 16, 
        borderRadius: 12, 
        marginBottom: 12,
    },
    helperText: {
        opacity: 0.7,
    },
    divider: {
        marginVertical: 24,
    },
    dividerSmall: {
        marginVertical: 8,
    },
    sectionTitle: {
        marginBottom: 12,
    },
    segmentedButtons: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
    },
    syncButton: {
        marginBottom: 24, 
        borderRadius: 8,
    },
    dangerTitle: {
        color: '#B00020',
        marginBottom: 8, 
        fontWeight: 'bold',
    },
    deleteButton: {
        borderRadius: 8,
    },
});

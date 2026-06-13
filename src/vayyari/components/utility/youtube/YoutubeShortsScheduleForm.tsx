import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { youtubeService } from '@/services/youtube.service';
import { aiService } from '@/services/ai.service';

interface YoutubeShortsScheduleFormProps {
    mediaId?: string;
    initialTitle?: string;
    initialDescription?: string;
    videoUri?: string;
    onSuccess: (response: any) => void;
    onCancel?: () => void;
    onBusyChange?: (isBusy: boolean) => void;
}

export const YoutubeShortsScheduleForm: React.FC<YoutubeShortsScheduleFormProps> = ({
    mediaId,
    initialTitle = '',
    initialDescription = '',
    videoUri,
    onSuccess,
    onCancel,
    onBusyChange
}) => {
    const theme = useTheme();
    const [youtubeTitle, setYoutubeTitle] = useState(initialTitle);
    const [youtubeDesc, setYoutubeDesc] = useState(initialDescription);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        onBusyChange?.(isUploading);
    }, [isUploading, onBusyChange]);
    const [nextSlot, setNextSlot] = useState<string | null>(null);
    const [showScheduleDatePicker, setShowScheduleDatePicker] = useState(false);
    const [showScheduleTimePicker, setShowScheduleTimePicker] = useState(false);

    useEffect(() => {
        fetchNextSlot();
    }, []);

    const fetchNextSlot = async () => {
        try {
            const resp = await youtubeService.getNextSlot();
            setNextSlot(resp.nextSlot);
        } catch (error) {
            console.error('Failed to fetch next slot:', error);
        }
    };

    const handleGenerateAiTitle = async () => {
        if (!youtubeDesc) return;
        try {
            setIsGeneratingTitle(true);
            const title = await aiService.generateYoutubeTitle(youtubeDesc);
            setYoutubeTitle(title);
        } catch {
            Alert.alert('AI Error', 'Failed to generate title.');
        } finally {
            setIsGeneratingTitle(false);
        }
    };

    const handleInternalSchedule = async () => {
        if (!mediaId) {
            Alert.alert('Error', 'No video asset found for this post.');
            return;
        }
        if (!nextSlot) return;
        try {
            setIsUploading(true);
            const resp = await youtubeService.uploadVideo({
                mediaId: mediaId,
                title: youtubeTitle,
                description: youtubeDesc,
                tags: ['shorts', 'reels'],
                isShort: true,
                scheduleTime: nextSlot
            });
            
            Alert.alert('Success', `Scheduled on YouTube!\nVideo ID: ${resp.videoId}`);
            onSuccess(resp);
        } catch (err: any) {
            Alert.alert('Scheduling Failed', err.message || 'An error occurred.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                Schedule YouTube Short
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <TextInput
                    label="Title"
                    value={youtubeTitle}
                    onChangeText={setYoutubeTitle}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Video title..."
                    right={
                        <TextInput.Icon 
                            icon={isGeneratingTitle ? () => <ActivityIndicator size="small" color={theme.colors.primary} /> : "auto-fix"} 
                            onPress={handleGenerateAiTitle}
                            disabled={isGeneratingTitle || !youtubeDesc}
                            color={isGeneratingTitle ? theme.colors.primary : "#6200ee"}
                        />
                    }
                />
                <TextInput
                    label="Description"
                    value={youtubeDesc}
                    onChangeText={setYoutubeDesc}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    style={styles.input}
                />
                
                <View style={styles.scheduleRow}>
                    <View style={styles.dateInput}>
                        <TextInput
                            label="Date"
                            value={nextSlot ? new Date(nextSlot).toLocaleDateString([], { dateStyle: 'medium' }) : ''}
                            mode="outlined"
                            editable={false}
                            style={styles.scheduleInputText}
                            contentStyle={styles.scheduleInputContent}
                            right={<TextInput.Icon icon="calendar" size={18} onPress={() => setShowScheduleDatePicker(true)} style={styles.scheduleIcon} />}
                        />
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill} 
                            onPress={() => setShowScheduleDatePicker(true)} 
                        />
                    </View>
                    <View style={styles.timeInput}>
                        <TextInput
                            label="Time"
                            value={nextSlot ? new Date(nextSlot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                            mode="outlined"
                            editable={false}
                            style={styles.scheduleInputText}
                            contentStyle={styles.scheduleInputContent}
                            right={<TextInput.Icon icon="clock-outline" size={18} onPress={() => setShowScheduleTimePicker(true)} style={styles.scheduleIcon} />}
                        />
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill} 
                            onPress={() => setShowScheduleTimePicker(true)} 
                        />
                    </View>
                </View>

                <Text variant="bodySmall" style={styles.helperText}>
                    Default interval is 6 hours between posts.
                </Text>

                {showScheduleDatePicker && (
                    <DateTimePicker
                        value={nextSlot ? new Date(nextSlot) : new Date()}
                        mode="date"
                        onChange={(event, date) => {
                            setShowScheduleDatePicker(false);
                            if (date && nextSlot) {
                                const current = new Date(nextSlot);
                                current.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                setNextSlot(current.toISOString());
                            }
                        }}
                    />
                )}

                {showScheduleTimePicker && (
                    <DateTimePicker
                        value={nextSlot ? new Date(nextSlot) : new Date()}
                        mode="time"
                        onChange={(event, date) => {
                            setShowScheduleTimePicker(false);
                            if (date && nextSlot) {
                                const current = new Date(nextSlot);
                                current.setHours(date.getHours(), date.getMinutes());
                                setNextSlot(current.toISOString());
                            }
                        }}
                    />
                )}

                <View style={styles.actions}>
                    <Button 
                        mode="contained"
                        loading={isUploading}
                        disabled={isUploading || !nextSlot}
                        style={styles.submitButton}
                        onPress={handleInternalSchedule}
                    >
                        Schedule Post
                    </Button>
                    <Button 
                        onPress={onCancel} 
                        disabled={isUploading}
                        style={styles.cancelButton}
                    >
                        Cancel
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    title: {
        marginBottom: 24,
        fontWeight: 'bold',
    },
    input: {
        marginBottom: 16,
    },
    scheduleRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    dateInput: {
        flex: 1.5,
        position: 'relative',
    },
    timeInput: {
        flex: 1,
        position: 'relative',
    },
    scheduleInputText: {
        fontSize: 13,
    },
    scheduleInputContent: {
        paddingHorizontal: 8,
    },
    scheduleIcon: {
        margin: 0,
    },
    helperText: {
        opacity: 0.6,
        marginBottom: 20,
        fontStyle: 'italic',
    },
    actions: {
        marginTop: 12,
        gap: 12,
    },
    submitButton: {
        borderRadius: 12,
        paddingVertical: 6,
    },
    cancelButton: {
        marginTop: 4,
    }
});

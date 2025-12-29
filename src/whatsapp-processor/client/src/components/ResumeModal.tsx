import { useState } from 'react';
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton, Stack, Text } from '@fluentui/react';
import { includeChat } from '../services/api.service';

interface ResumeModalProps {
    jid: string;
    name: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ResumeModal({ jid, name, onClose, onSuccess }: ResumeModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMode, setSelectedMode] = useState<'from_last' | 'from_now' | null>(null);

    const handleResume = async () => {
        if (!selectedMode) return;

        setIsLoading(true);
        try {
            await includeChat(jid, selectedMode);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to include chat:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog
            hidden={false}
            onDismiss={onClose}
            dialogContentProps={{
                type: DialogType.normal,
                title: 'Resume Tracking',
                subText: `How would you like to resume tracking for ${name}?`,
            }}
            modalProps={{
                isBlocking: true,
                styles: { main: { maxWidth: 500 } },
            }}
        >
            <Stack tokens={{ childrenGap: 16 }}>
                <Stack
                    onClick={() => setSelectedMode('from_last')}
                    styles={{
                        root: {
                            padding: '16px',
                            backgroundColor: selectedMode === 'from_last' ? '#0078d4' : '#252525',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            border: selectedMode === 'from_last' ? '2px solid #0078d4' : '2px solid transparent',
                            ':hover': {
                                backgroundColor: selectedMode === 'from_last' ? '#106ebe' : '#2d2d2d',
                            },
                        },
                    }}
                >
                    <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, marginBottom: 4 } }}>
                        📥 Resume from last message
                    </Text>
                    <Text variant="small" styles={{ root: { color: '#a0a0a0' } }}>
                        Backfill all messages since tracking was stopped
                    </Text>
                </Stack>

                <Stack
                    onClick={() => setSelectedMode('from_now')}
                    styles={{
                        root: {
                            padding: '16px',
                            backgroundColor: selectedMode === 'from_now' ? '#0078d4' : '#252525',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            border: selectedMode === 'from_now' ? '2px solid #0078d4' : '2px solid transparent',
                            ':hover': {
                                backgroundColor: selectedMode === 'from_now' ? '#106ebe' : '#2d2d2d',
                            },
                        },
                    }}
                >
                    <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, marginBottom: 4 } }}>
                        ⏭️ Resume from now
                    </Text>
                    <Text variant="small" styles={{ root: { color: '#a0a0a0' } }}>
                        Start tracking new messages only (leave gap in history)
                    </Text>
                </Stack>
            </Stack>

            <DialogFooter>
                <PrimaryButton
                    onClick={handleResume}
                    text="Resume"
                    disabled={!selectedMode || isLoading}
                />
                <DefaultButton onClick={onClose} text="Cancel" disabled={isLoading} />
            </DialogFooter>
        </Dialog>
    );
}

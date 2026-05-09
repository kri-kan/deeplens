import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useVideoSettings = () => {
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolume] = useState(1.0);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedMuted = await AsyncStorage.getItem('video_muted');
                const storedVolume = await AsyncStorage.getItem('video_volume');
                if (storedMuted !== null) setIsMuted(storedMuted === 'true');
                if (storedVolume !== null) setVolume(parseFloat(storedVolume));
            } catch (e) {
                console.error('Failed to load video settings', e);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        const saveSettings = async () => {
            try {
                await AsyncStorage.setItem('video_muted', isMuted.toString());
                await AsyncStorage.setItem('video_volume', volume.toString());
            } catch (e) {
                console.error('Failed to save video settings', e);
            }
        };
        saveSettings();
    }, [isMuted, volume]);

    return {
        isMuted,
        setIsMuted,
        volume,
        setVolume
    };
};

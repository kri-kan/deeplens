import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { InstagramPost } from '@/services/instagram.service';
import { getMediaUri, normalizeData } from '@/utils/instagram-helpers';

interface CustomVideoPlayerProps {
    media: InstagramPost;
    width: number;
    getMediaHeight: () => number;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    volume: number;
    setVolume: (volume: number) => void;
    isPlaying: boolean;
    isActive: boolean;
}

export const InstagramVideoPlayer = React.memo(({ 
    media,
    width, 
    getMediaHeight, 
    isMuted, 
    setIsMuted, 
    volume, 
    setVolume, 
    isPlaying, 
    isActive
}: CustomVideoPlayerProps) => {
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const sliderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const uri = getMediaUri(media);
    const currentUriRef = useRef<string | null>(uri);

    const player = useVideoPlayer(uri, (p) => {
        p.loop = true;
        p.muted = isMuted;
        p.volume = volume;
        if (isPlaying && isActive) p.play();
    });

    const [isReady, setIsReady] = useState(player.status === 'readyToPlay');

    useEffect(() => {
        setIsReady(player.status === 'readyToPlay');
    }, [uri, player]);

    useEffect(() => {
        if (!player) return;
        if (isPlaying && isActive) player.play();
        else player.pause();
    }, [isPlaying, player, isActive]);

    useEffect(() => {
        if (!player) return;

        // Sync initial state
        if (player.status === 'readyToPlay') {
            setIsReady(true);
        }

        const stateSub = player.addListener('playingChange', (event) => {
            if (isActive) console.log(`[Video] Playing: ${event.isPlaying} | URI: ${uri}`);
        });

        const statusSub = player.addListener('statusChange', (event) => {
            if (isActive) console.log(`[Video] Status: ${event.status} | URI: ${uri}`);
            if (event.status === 'readyToPlay') {
                setIsReady(true);
            }
            if (event.error && isActive) {
                if (uri?.toLowerCase().endsWith('.jpg') || uri?.toLowerCase().endsWith('.jpeg')) return;
                console.error(`[Video] Error: ${event.error.message} | URI: ${uri}`);
            }
        });

        return () => {
            stateSub.remove();
            statusSub.remove();
        };
    }, [player, isActive, uri]);

    useEffect(() => {
        if (!player) return;
        player.muted = isMuted;
        player.volume = volume;
    }, [isMuted, volume, player]);

    useEffect(() => {
        if (isActive && uri) {
            const normalized = normalizeData(media);
            console.log('[Video] Data:', { 
                id: normalized?.id, 
                mediaType: normalized?.mediaType, 
                hasPath: !!normalized?.storagePath,
                path: normalized?.storagePath 
            });
        }
    }, [isActive, uri, media]);

    const resetSliderTimer = useCallback(() => {
        if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
        sliderTimerRef.current = setTimeout(() => {
            setShowVolumeSlider(false);
        }, 3000);
    }, []);

    useEffect(() => {
        if (showVolumeSlider) resetSliderTimer();
        return () => {
            if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
        };
    }, [showVolumeSlider, resetSliderTimer]);

    useEffect(() => {
        if (isActive && player && uri) {
            try {
                if (currentUriRef.current !== uri) {
                    player.replaceAsync(uri);
                    currentUriRef.current = uri;
                    setIsReady(player.status === 'readyToPlay');
                }
                if (isPlaying) {
                    player.play();
                }
            } catch (err) {
                console.error('[VideoPlayer] Source update error:', err);
            }
        }
    }, [isActive, uri, player, isPlaying]);

    return (
        <View style={{ width, height: getMediaHeight() }}>
            <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
            />
            
            {!isReady && (
                <Image 
                    source={{ uri: media?.thumbnailUrl || media?.mediaUrl }} 
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                />
            )}
            
            <View style={styles.rightVolumeOverlay}>
                <IconButton
                    icon={isMuted || volume === 0 ? "volume-off" : "volume-high"}
                    iconColor="white"
                    size={28}
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                    onPress={() => setIsMuted(!isMuted)}
                    onLongPress={() => setShowVolumeSlider(!showVolumeSlider)}
                />
                
                {showVolumeSlider && (
                    <View style={styles.rightVolumeSliderContainer}>
                        <View style={styles.volumeSliderTrack}>
                            <View style={[styles.volumeSliderFill, { height: `${volume * 100}%` }]} />
                        </View>
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill}
                            onPressIn={(e) => {
                                const y = e.nativeEvent.locationY;
                                const newVol = Math.max(0, Math.min(1, 1 - (y / 100)));
                                setVolume(newVol);
                                if (newVol > 0) setIsMuted(false);
                                resetSliderTimer();
                            }}
                        />
                    </View>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    rightVolumeOverlay: {
        position: 'absolute',
        bottom: 80,
        right: 16,
        zIndex: 10,
        alignItems: 'center',
    },
    rightVolumeSliderContainer: {
        position: 'absolute',
        bottom: 50,
        width: 40,
        height: 100,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        padding: 10,
        alignItems: 'center',
    },
    volumeSliderTrack: {
        width: 4,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        justifyContent: 'flex-end',
    },
    volumeSliderFill: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 2,
    },
});
